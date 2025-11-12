import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AcceptInvitationRequest {
  token: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Non authentifié');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Non authentifié');

    const { token: invitationToken }: AcceptInvitationRequest = await req.json();

    console.log('Processing invitation acceptance:', { user_id: user.id, token: invitationToken });

    // Récupérer l'invitation
    const { data: invitation, error: invError } = await supabase
      .from('event_invitation')
      .select('*')
      .eq('token', invitationToken)
      .eq('status', 'pending')
      .single();

    if (invError || !invitation) {
      throw new Error('Invitation introuvable ou expirée');
    }

    // Vérifier que l'email correspond
    if (invitation.invitee_email.toLowerCase() !== user.email?.toLowerCase()) {
      throw new Error('Votre email ne correspond pas à l\'invitation');
    }

    // Vérifier que l'invitation n'est pas expirée
    if (new Date(invitation.expires_at) < new Date()) {
      throw new Error('Cette invitation a expiré');
    }

    console.log('Invitation valid, adding user to event');

    // Vérifier si l'utilisateur n'est pas déjà membre
    const { data: existingMember } = await supabase
      .from('user_event')
      .select('*')
      .eq('user_id', user.id)
      .eq('event_id', invitation.event_id)
      .single();

    if (existingMember) {
      // Supprimer l'invitation même si déjà membre
      await supabase
        .from('event_invitation')
        .delete()
        .eq('id', invitation.id);
      
      throw new Error('Vous êtes déjà membre de cet événement');
    }

    // Ajouter l'utilisateur à l'event
    const { error: insertError } = await supabase
      .from('user_event')
      .insert({
        user_id: user.id,
        event_id: invitation.event_id,
        role: invitation.role,
      });

    if (insertError) {
      console.error('Error inserting user_event:', insertError);
      throw insertError;
    }

    console.log('User added to event successfully');

    // Supprimer l'invitation
    const { error: deleteError } = await supabase
      .from('event_invitation')
      .delete()
      .eq('id', invitation.id);

    if (deleteError) {
      console.error('Error deleting invitation:', deleteError);
    }

    return new Response(
      JSON.stringify({ success: true, event_id: invitation.event_id }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error: any) {
    console.error('Error in accept-event-invitation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
