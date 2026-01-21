import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { slug, token } = body;

    if (!slug) {
      return new Response(
        JSON.stringify({ error: 'Slug requis', code: 400 }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer l'événement avec SERVICE_ROLE_KEY (bypass RLS)
    const { data: eventData, error: eventError } = await supabase
      .from('event')
      .select('*')
      .eq('slug', slug)
      .single();

    // Cas 4 : L'événement n'existe pas
    if (eventError || !eventData) {
      return new Response(
        JSON.stringify({ error: 'Événement inexistant', code: 404 }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cas 1 : L'événement est public - retour IMMÉDIAT (pas de vérification auth)
    if (eventData.is_public) {
      const safeEventData = { ...eventData };
      // Masquer par défaut les champs confidentiels pour tous
      if (eventData.confidential_address) safeEventData.address = null;
      if (eventData.confidential_phone) safeEventData.contact_phone = null;
      if (eventData.confidential_email) safeEventData.contact_email = null;

      return new Response(
        JSON.stringify({ event: safeEventData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cas 2 : L'événement est privé - vérifier le TOKEN EN PREMIER (rapide)
    if (token && token === eventData.private_token) {
      const safeEventData = { ...eventData };
      // Token seul = pas d'accès confidentiel par défaut
      if (eventData.confidential_address) safeEventData.address = null;
      if (eventData.confidential_phone) safeEventData.contact_phone = null;
      if (eventData.confidential_email) safeEventData.contact_email = null;

      return new Response(
        JSON.stringify({ event: safeEventData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cas 3 : Pas de token valide - vérifier l'authentification (seulement si nécessaire)
    let hasLegitimateAccess = false;
    let hasConfidentialAccess = false;

    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const authToken = authHeader.replace('Bearer ', '');
      const { data: { user: authUser } } = await supabase.auth.getUser(authToken);
      
      if (authUser) {
        // L'organisateur a toujours accès
        if (eventData.organizer_id === authUser.id) {
          hasLegitimateAccess = true;
          hasConfidentialAccess = true;
        } else {
          // Vérifier si membre de l'événement
          const { data: membership } = await supabase
            .from('user_event')
            .select('role')
            .eq('event_id', eventData.id)
            .eq('user_id', authUser.id)
            .single();
          
          if (membership) {
            hasLegitimateAccess = true;
            hasConfidentialAccess = true;
          }
        }
      }
    }

    // Pas d'accès légitime → 403
    if (!hasLegitimateAccess) {
      return new Response(
        JSON.stringify({ error: 'Accès refusé - token requis', code: 403 }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Accès accordé via auth - appliquer le masquage conditionnel
    const safeEventData = { ...eventData };
    if (!hasConfidentialAccess) {
      if (eventData.confidential_address) {
        safeEventData.address = null;
      }
      if (eventData.confidential_phone) {
        safeEventData.contact_phone = null;
      }
      if (eventData.confidential_email) {
        safeEventData.contact_email = null;
      }
    }

    return new Response(
      JSON.stringify({ event: safeEventData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-event-by-slug:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur serveur', code: 500 }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
