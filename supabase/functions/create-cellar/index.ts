import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { corsHeaders } from "../_shared/cors.ts";

function sanitizeSlugInput(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // supprime accents
    .replace(/[^a-z0-9-]/g, "-")     // remplace interdits par -
    .replace(/-+/g, "-")             // évite "----"
    .replace(/^-+|-+$/g, "")         // trim "-"
    .slice(0, 60);                   // limite 60 caractères
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    });

    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const {
      name,
      description,
      location,
      latitude,
      longitude,
      is_public,
      is_seller,
      logo_url,
      banner_url,
      custom_slug
    } = await req.json();

    console.log('Creating cellar with params:', {
      name,
      is_public,
      custom_slug
    });

    let slug: string;

    // Génération du slug
    if (is_public) {
      // Cave publique : utiliser custom_slug ou générer depuis le nom
      if (custom_slug && custom_slug.trim()) {
        slug = sanitizeSlugInput(custom_slug);
      } else {
        const baseSlug = sanitizeSlugInput(name);
        const randomId = crypto.randomUUID().slice(0, 4);
        slug = `${baseSlug}-${randomId}`;
      }

      // Validation du slug public
      if (slug.length < 3) {
        return new Response(
          JSON.stringify({ error: 'Le slug doit contenir au moins 3 caractères' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!/^[a-z0-9-]+$/.test(slug)) {
        return new Response(
          JSON.stringify({ error: 'Le slug contient des caractères non autorisés' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Vérifier l'unicité parmi les caves publiques
      const { data: existingCellar } = await supabaseClient
        .from('cellar')
        .select('id')
        .eq('slug', slug)
        .eq('is_public', true)
        .single();

      if (existingCellar) {
        return new Response(
          JSON.stringify({ error: 'Ce slug est déjà utilisé par une autre cave publique' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Cave privée : slug automatique
      const randomId = crypto.randomUUID().slice(0, 8);
      slug = `cellar-${randomId}`;
    }

    console.log('Generated slug:', slug);

    // Créer la cave
    const { data: cellar, error: cellarError } = await supabaseClient
      .from('cellar')
      .insert({
        name,
        description,
        location,
        latitude,
        longitude,
        is_public,
        is_seller,
        logo_url,
        banner_url,
        slug
      })
      .select()
      .single();

    if (cellarError) {
      console.error('Error creating cellar:', cellarError);
      return new Response(
        JSON.stringify({ error: cellarError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Cellar created:', cellar.id);

    // Créer la relation user_cellar (owner)
    const { error: relationError } = await supabaseClient
      .from('user_cellar')
      .insert({
        user_id: user.id,
        user_cellar_id: cellar.id,
        role: 'owner'
      });

    if (relationError) {
      console.error('Error creating user_cellar relation:', relationError);
      // Supprimer la cave si la relation échoue
      await supabaseClient.from('cellar').delete().eq('id', cellar.id);
      
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la création de la relation utilisateur' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Cellar creation successful');

    return new Response(
      JSON.stringify({
        cellar_id: cellar.id,
        slug: cellar.slug
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-cellar function:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
