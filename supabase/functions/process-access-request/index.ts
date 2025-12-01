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

    const { request_id, approve } = await req.json();

    if (!request_id || approve === undefined) {
      return new Response(
        JSON.stringify({ error: 'request_id et approve requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer la demande
    const { data: request, error: requestError } = await supabase
      .from('event_access_request')
      .select('id, event_id, user_id, status')
      .eq('id', request_id)
      .single();

    if (requestError || !request) {
      return new Response(
        JSON.stringify({ error: 'Demande introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (request.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: 'Cette demande a déjà été traitée' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier que l'utilisateur est organizer ou co_organizer
    const { data: userEvent } = await supabase
      .from('user_event')
      .select('role')
      .eq('event_id', request.event_id)
      .eq('user_id', user.id)
      .single();

    if (!userEvent || !['organizer', 'co_organizer'].includes(userEvent.role)) {
      return new Response(
        JSON.stringify({ error: 'Vous n\'avez pas les permissions pour traiter cette demande' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mettre à jour le statut de la demande
    const { error: updateError } = await supabase
      .from('event_access_request')
      .update({
        status: approve ? 'approved' : 'rejected',
        processed_by: user.id,
        processed_at: new Date().toISOString(),
      })
      .eq('id', request_id);

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Si approuvé, ajouter l'utilisateur à event_member
    if (approve) {
      const { data: event } = await supabase
        .from('event')
        .select('access_type')
        .eq('id', request.event_id)
        .single();

      const { error: memberError } = await supabase
        .from('event_member')
        .insert({
          event_id: request.event_id,
          user_id: request.user_id,
          access_type: event?.access_type || 'request_based',
          granted_by: user.id,
        });

      if (memberError) {
        console.error('Member insert error:', memberError);
        // Ne pas échouer complètement, la demande est approuvée
      }
    }

    console.log('Access request processed:', request_id, approve ? 'approved' : 'rejected');

    return new Response(
      JSON.stringify({ 
        success: true,
        approved: approve 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in process-access-request:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
