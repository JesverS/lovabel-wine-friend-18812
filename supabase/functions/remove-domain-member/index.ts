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

    const { member_user_id, domain_id } = await req.json();

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

    // Seul le propriétaire (1) peut retirer des membres
    if (userRole.role !== 1) {
      return new Response(
        JSON.stringify({ error: 'Seul le propriétaire peut retirer des membres' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier le membre à retirer
    const { data: memberRole, error: memberError } = await supabase
      .from('user_domain')
      .select('role')
      .eq('user_id', member_user_id)
      .eq('domain_id', domain_id)
      .single();

    if (memberError || !memberRole) {
      return new Response(
        JSON.stringify({ error: 'Membre introuvable' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ne pas retirer le propriétaire ou soi-même
    if (memberRole.role === 1 || member_user_id === user.id) {
      return new Response(
        JSON.stringify({ error: 'Action non autorisée' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Retirer le membre
    const { error } = await supabase
      .from('user_domain')
      .delete()
      .eq('user_id', member_user_id)
      .eq('domain_id', domain_id);

    if (error) throw error;

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
