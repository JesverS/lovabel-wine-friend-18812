import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { application_user_id, domain_id } = await req.json();

    // Vérifier le rôle de l'utilisateur dans le domaine
    const { data: userRole, error: roleError } = await supabase
      .from('user_domain')
      .select('role')
      .eq('user_id', user.id)
      .eq('domain_id', domain_id)
      .single();

    if (roleError || !userRole) {
      return new Response(
        JSON.stringify({ error: 'Vous n\'êtes pas membre de ce domaine' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Seuls propriétaires (1) et admins (2) peuvent approuver
    if (userRole.role > 2) {
      return new Response(
        JSON.stringify({ error: 'Permissions insuffisantes' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer l'application
    const { data: application, error: appError } = await supabase
      .from('user_domain_application')
      .select('*')
      .eq('user_id', application_user_id)
      .eq('domain_id', domain_id)
      .single();

    if (appError || !application) {
      return new Response(
        JSON.stringify({ error: 'Application introuvable' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Les admins (2) ne peuvent approuver que des membres (3)
    if (userRole.role === 2 && application.role !== 3) {
      return new Response(
        JSON.stringify({ error: 'Vous ne pouvez approuver que des demandes de membres' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Approuver: insérer dans user_domain
    const { error: insertError } = await supabase
      .from('user_domain')
      .insert({
        user_id: application.user_id,
        domain_id: domain_id,
        role: application.role
      });

    if (insertError) throw insertError;

    // Supprimer l'application
    const { error: deleteError } = await supabase
      .from('user_domain_application')
      .delete()
      .eq('user_id', application_user_id)
      .eq('domain_id', domain_id);

    if (deleteError) throw deleteError;

    return new Response(
      JSON.stringify({ success: true }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Erreur serveur' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
