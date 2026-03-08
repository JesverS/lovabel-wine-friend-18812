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

    // Cas : L'événement n'existe pas
    if (eventError || !eventData) {
      return new Response(
        JSON.stringify({ error: 'Événement inexistant', code: 404 }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ÉTAPE 1 : Vérifier l'authentification et le membership EN PREMIER
    // (pour savoir si l'utilisateur a droit aux infos confidentielles)
    let isMember = false;
    let hasConfidentialAccess = false;

    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const authToken = authHeader.replace('Bearer ', '');
      const { data: { user: authUser } } = await supabase.auth.getUser(authToken);
      
      if (authUser) {
        // L'organisateur a toujours accès complet
        if (eventData.organizer_id === authUser.id) {
          isMember = true;
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
            isMember = true;
            hasConfidentialAccess = true;
          }
        }
      }
    }

    // Helper: fetch public event posts (for non-members with token or public events)
    const fetchPublicPosts = async (eventId: string) => {
      const { data: posts } = await supabase
        .from('event_post')
        .select('id, event_id, author_id, content, image_url, visibility, created_at, updated_at, likes_count, comment_count')
        .eq('event_id', eventId)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(50);
      return posts || [];
    };

    // Fonction helper pour construire la réponse avec masquage
    const buildResponse = async (applyMasking: boolean, includePublicPosts: boolean = false) => {
      const safeEventData = { ...eventData };
      let hasHiddenContactInfo = false;
      let hasHiddenAddress = false;

      if (applyMasking) {
        if (eventData.confidential_address && eventData.address) {
          safeEventData.address = null;
          hasHiddenAddress = true;
        }
        if (eventData.confidential_phone && eventData.contact_phone) {
          safeEventData.contact_phone = null;
          hasHiddenContactInfo = true;
        }
        if (eventData.confidential_email && eventData.contact_email) {
          safeEventData.contact_email = null;
          hasHiddenContactInfo = true;
        }
      }

      const responseData: any = { 
        event: safeEventData,
        hasHiddenContactInfo,
        hasHiddenAddress
      };

      if (includePublicPosts) {
        responseData.publicPosts = await fetchPublicPosts(eventData.id);
      }

      return new Response(
        JSON.stringify(responseData),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    };

    // ÉTAPE 2 : L'événement est public
    if (eventData.is_public) {
      // Si l'utilisateur est membre → accès complet (pas de masquage)
      // Sinon → masquer selon les flags confidential_*, inclure posts publics
      return buildResponse(!hasConfidentialAccess, !hasConfidentialAccess);
    }

    // ÉTAPE 3 : L'événement est privé - vérifier le TOKEN
    if (token && token === eventData.private_token) {
      // Token valide mais pas membre → masquer les infos confidentielles
      // Token valide ET membre → accès complet
      return buildResponse(!hasConfidentialAccess);
    }

    // ÉTAPE 4 : Événement privé sans token valide
    // Seuls les membres/organisateurs peuvent accéder
    if (!isMember) {
      return new Response(
        JSON.stringify({ error: 'Accès refusé - token requis', code: 403 }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Membre authentifié → accès complet
    return buildResponse(false);
  } catch (error) {
    console.error('Error in get-event-by-slug:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur serveur', code: 500 }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
