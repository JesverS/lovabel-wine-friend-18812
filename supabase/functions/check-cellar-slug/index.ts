import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Client pour authentification avec SERVICE_ROLE_KEY
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Vérifier l'authentification
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Client admin pour opérations DB (bypass RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { slug, cellar_id } = await req.json();

    console.log('Checking slug:', slug, 'for cellar:', cellar_id, 'user:', user.id);

    // Validation du format
    if (!slug || slug.trim().length === 0) {
      return new Response(
        JSON.stringify({
          status: 'invalid',
          message: 'Le slug ne peut pas être vide'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (slug.length < 3) {
      return new Response(
        JSON.stringify({
          status: 'invalid',
          message: 'Le slug doit contenir au moins 3 caractères'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (slug.length > 60) {
      return new Response(
        JSON.stringify({
          status: 'invalid',
          message: 'Le slug ne peut pas dépasser 60 caractères'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return new Response(
        JSON.stringify({
          status: 'invalid',
          message: 'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (/--/.test(slug)) {
      return new Response(
        JSON.stringify({
          status: 'invalid',
          message: 'Le slug ne peut pas contenir deux tirets consécutifs'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier l'unicité parmi les caves publiques (utilise supabaseAdmin pour bypass RLS)
    let query = supabaseAdmin
      .from('cellar')
      .select('id')
      .eq('slug', slug)
      .eq('is_public', true);

    // Exclure la cave actuelle lors d'une mise à jour
    if (cellar_id) {
      query = query.neq('id', cellar_id);
    }

    const { data: existingCellar } = await query.single();

    if (existingCellar) {
      return new Response(
        JSON.stringify({
          status: 'taken',
          message: 'Ce slug est déjà utilisé par une autre cave'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Slug available:', slug);

    return new Response(
      JSON.stringify({
        status: 'available',
        message: 'Ce slug est disponible'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-cellar-slug function:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
