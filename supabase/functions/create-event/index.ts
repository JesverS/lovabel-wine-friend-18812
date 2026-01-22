import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function sanitizeSlugInput(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function generateEventSlug(eventName: string): string {
  const baseSlug = sanitizeSlugInput(eventName);
  const randomId = crypto.randomUUID().slice(0, 8);
  return `${baseSlug}-${randomId}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Utilisateur non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const {
      name,
      description,
      start_date,
      end_date,
      address,
      city,
      location,
      category,
      is_public,
      latitude,
      longitude,
      cellar_id,
      access_type,
      price,
      currency,
      max_participants,
      confidential_address,
      confidential_phone,
      confidential_participant_list,
      contact_phone,
      contact_email,
      confidential_email,
    } = body;

    if (!name || !start_date || !city) {
      return new Response(
        JSON.stringify({ error: 'Champs requis manquants (name, start_date, city)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validation du prix minimum pour les événements payants (doit couvrir les frais Stripe)
    const MIN_EVENT_PRICE = 3.00;
    if (access_type === 'paid' && (!price || price < MIN_EVENT_PRICE)) {
      return new Response(
        JSON.stringify({ error: `Le prix minimum pour un événement payant est de ${MIN_EVENT_PRICE.toFixed(2)} €` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validation pour les événements payants : vérifier que l'organisateur a un compte Stripe actif
    if (access_type === 'paid') {
      const { data: stripeAccount } = await supabase
        .from('organizer_stripe_account')
        .select('charges_enabled')
        .eq('user_id', user.id)
        .single();
      
      if (!stripeAccount?.charges_enabled) {
        return new Response(
          JSON.stringify({ error: 'Vous devez configurer votre compte Stripe pour créer un événement payant. Rendez-vous dans les paramètres de votre profil.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Générer le slug
    const slug = generateEventSlug(name);

    // Générer le token privé si nécessaire
    const private_token = is_public === false ? crypto.randomUUID() : null;

    // Créer l'événement
    const { data: eventData, error: eventError } = await supabase
      .from('event')
      .insert({
        name,
        slug,
        description: description || null,
        start_date,
        end_date: end_date || null,
        address: address || null,
        city,
        location: location || address || city,
        category: category || null,
        is_public: is_public !== false,
        private_token,
        organizer_id: user.id,
        latitude: latitude || null,
        longitude: longitude || null,
        cellar_id: cellar_id || null,
        access_type: access_type || 'public',
        price: price || null,
        currency: currency || 'EUR',
        max_participants: max_participants || null,
        confidential_address: confidential_address || false,
        confidential_phone: confidential_phone || false,
        confidential_participant_list: confidential_participant_list || false,
        confidential_email: confidential_email || false,
        contact_phone: contact_phone || null,
        contact_email: contact_email || null,
      })
      .select()
      .single();

    if (eventError) {
      console.error('Event insert error:', eventError);
      return new Response(
        JSON.stringify({ error: eventError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Créer la relation user_event avec rôle organizer
    const { error: userEventError } = await supabase
      .from('user_event')
      .insert({
        user_id: user.id,
        event_id: eventData.id,
        role: 'organizer',
      });

    if (userEventError) {
      console.error('User event insert error:', userEventError);
      // Rollback: supprimer l'événement créé
      await supabase.from('event').delete().eq('id', eventData.id);
      return new Response(
        JSON.stringify({ error: userEventError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Event created:', eventData.id, 'slug:', slug);

    return new Response(
      JSON.stringify({
        event_id: eventData.id,
        slug,
        private_token,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-event:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
