import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

    const { event_id, message } = await req.json();

    if (!event_id) {
      return new Response(
        JSON.stringify({ error: 'event_id requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier que l'événement existe et son type d'accès
    const { data: event, error: eventError } = await supabase
      .from('event')
      .select('id, access_type, name')
      .eq('id', event_id)
      .single();

    if (eventError || !event) {
      return new Response(
        JSON.stringify({ error: 'Événement introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier que l'événement accepte les demandes
    if (event.access_type !== 'request_based') {
      return new Response(
        JSON.stringify({ error: 'Cet événement n\'accepte pas les demandes d\'accès' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier qu'il n'y a pas déjà une demande en attente
    const { data: existingRequest } = await supabase
      .from('event_access_request')
      .select('id, status')
      .eq('event_id', event_id)
      .eq('user_id', user.id)
      .single();

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return new Response(
          JSON.stringify({ error: 'Vous avez déjà une demande en attente pour cet événement' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Vérifier que l'utilisateur n'a pas déjà accès
    const { data: existingMember } = await supabase
      .from('event_member')
      .select('id')
      .eq('event_id', event_id)
      .eq('user_id', user.id)
      .single();

    if (existingMember) {
      return new Response(
        JSON.stringify({ error: 'Vous avez déjà accès à cet événement' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Créer la demande d'accès
    const { data: request, error: insertError } = await supabase
      .from('event_access_request')
      .insert({
        event_id,
        user_id: user.id,
        message: message || null,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Access request created:', request.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        request_id: request.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in request-event-access:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
