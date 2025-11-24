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

    // Récupérer l'événement
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

    // Cas 1 : L'événement est public
    if (eventData.is_public) {
      return new Response(
        JSON.stringify({ event: eventData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // L'événement est privé
    // Cas 3 : Aucun token fourni
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Accès refusé - token requis', code: 403 }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cas 2 : Token fourni - vérification
    if (token !== eventData.private_token) {
      return new Response(
        JSON.stringify({ error: 'Token invalide', code: 403 }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Token valide
    return new Response(
      JSON.stringify({ event: eventData }),
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
