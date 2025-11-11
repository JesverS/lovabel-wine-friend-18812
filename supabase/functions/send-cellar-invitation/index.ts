import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvitationRequest {
  cellar_id: string;
  invitee_email: string;
  role: 'admin' | 'co_owner' | 'owner';
  cellar_name: string;
  inviter_name: string;
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
    if (!authHeader) {
      throw new Error('Non authentifié');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Non authentifié');
    }

    const { cellar_id, invitee_email, role, cellar_name, inviter_name }: InvitationRequest = await req.json();

    console.log('Processing invitation:', { cellar_id, invitee_email, role, user_id: user.id });

    // Vérifier que l'utilisateur est bien owner
    const { data: ownership } = await supabase
      .from('user_cellar')
      .select('role')
      .eq('user_id', user.id)
      .eq('user_cellar_id', cellar_id)
      .eq('role', 'owner')
      .single();

    if (!ownership) {
      throw new Error('Accès refusé : vous devez être propriétaire');
    }

    // Vérifier si l'email existe déjà dans la base
    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    // Générer un token unique
    const token_unique = crypto.randomUUID();

    console.log('Creating invitation with token:', token_unique);

    // Créer l'invitation
    const { data: invitation, error: invError } = await supabase
      .from('cellar_invitation')
      .insert({
        cellar_id,
        inviter_id: user.id,
        invitee_email: invitee_email.toLowerCase(),
        invitee_user_id: existingUser?.id || null,
        role,
        token: token_unique,
      })
      .select()
      .single();

    if (invError) {
      console.error('Error creating invitation:', invError);
      throw invError;
    }

    console.log('Invitation created:', invitation.id);

    // URL de l'invitation
    const invitationUrl = `${Deno.env.get('SITE_URL')}/cellar-invitation/${token_unique}`;

    console.log('Sending email to:', invitee_email);

    // Envoyer l'email via l'API Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Vinotek <onboarding@resend.dev>',
        to: [invitee_email],
        subject: `Invitation à rejoindre la cave "${cellar_name}"`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>Invitation à rejoindre une cave</h1>
            <p>Bonjour,</p>
            <p><strong>${inviter_name}</strong> vous invite à rejoindre la cave <strong>${cellar_name}</strong> en tant que <strong>${role === 'admin' ? 'Administrateur' : role === 'co_owner' ? 'Copropriétaire' : 'Propriétaire'}</strong>.</p>
            
            <div style="margin: 30px 0;">
              <a href="${invitationUrl}" 
                 style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Accepter l'invitation
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              Ce lien est valide pendant 7 jours.<br>
              Si vous ne souhaitez pas rejoindre cette cave, vous pouvez ignorer cet email.
            </p>
            
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              Vous pouvez également copier ce lien : ${invitationUrl}
            </p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.json();
      console.error('Resend API error:', error);
      throw new Error(`Failed to send email: ${JSON.stringify(error)}`);
    }

    const emailData = await emailResponse.json();
    console.log('Email sent successfully:', emailData);

    return new Response(
      JSON.stringify({ success: true, invitation_id: invitation.id }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error: any) {
    console.error('Error in send-cellar-invitation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});