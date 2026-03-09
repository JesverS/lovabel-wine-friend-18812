import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Client admin au niveau module — réutilisé entre les requêtes (pas de données utilisateur dedans)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { slug, token } = body;

    if (!slug) {
      return new Response(
        JSON.stringify({ error: 'Slug requis', code: 400 }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extraire le token d'auth en parallèle avec le fetch event
    const authHeader = req.headers.get('Authorization');
    const authToken = authHeader ? authHeader.replace('Bearer ', '') : null;

    // GROUPE 1 : fetch event + getUser en parallèle
    const [eventResult, userResult] = await Promise.all([
      supabase.from('event').select('*').eq('slug', slug).single(),
      authToken ? supabase.auth.getUser(authToken) : Promise.resolve({ data: { user: null } }),
    ]);

    const { data: eventData, error: eventError } = eventResult;
    const authUser = userResult.data?.user || null;

    if (eventError || !eventData) {
      return new Response(
        JSON.stringify({ error: 'Événement inexistant', code: 404 }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ÉTAPE 1 : Déterminer l'accès
    let isMember = false;
    let hasConfidentialAccess = false;
    let userRole: string | null = null;

    // On a besoin du membership pour le rôle — on le fera dans le groupe 2
    // Mais d'abord, vérifier l'accès de base pour décider si on retourne 403

    // Quick check organizer
    const isOrganizer = authUser && eventData.organizer_id === authUser.id;

    // ÉTAPE 2 : Vérifier l'accès selon public/privé/token
    const hasValidToken = token && token === eventData.private_token;
    const isPublic = eventData.is_public;

    if (!isPublic && !hasValidToken && !authUser) {
      return new Response(
        JSON.stringify({ error: 'Accès refusé - token requis', code: 403 }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GROUPE 2 : Toutes les requêtes parallèles (membership, domaines, vins, user data)
    const eventId = eventData.id;

    // Préparer les promesses conditionnelles
    const membershipPromise = authUser
      ? supabase.from('user_event').select('role').eq('event_id', eventId).eq('user_id', authUser.id).maybeSingle()
      : Promise.resolve({ data: null });

    const domainsPromise = supabase
      .from('event_domain')
      .select('domain_id, notes, stand_number, domain:domain_id(id, name, logo_url, region, slug)')
      .eq('event_id', eventId);

    const winesPromise = supabase
      .from('event_domain_wine')
      .select(`
        wine_id,
        domain_id,
        price,
        quantity,
        tasting_available,
        notice,
        wine:wine_id(
          id, name, year, label_url, description, domain_id, price,
          volume_ml, alcohol_percentage, characteristics, type,
          mode_culture, wine_classification, website_order_url,
          wine_classification_data:wine_classification(nom)
        )
      `)
      .eq('event_id', eventId);

    const accessRequestPromise = authUser
      ? supabase.from('event_access_request').select('id, status').eq('event_id', eventId).eq('user_id', authUser.id).eq('status', 'pending').maybeSingle()
      : Promise.resolve({ data: null });

    const pendingPaymentPromise = authUser
      ? supabase.from('event_payment').select('id, status, amount').eq('event_id', eventId).eq('user_id', authUser.id).eq('status', 'pending').maybeSingle()
      : Promise.resolve({ data: null });

    const completedPaymentPromise = authUser
      ? supabase.from('event_payment').select('id, amount').eq('event_id', eventId).eq('user_id', authUser.id).eq('status', 'completed').maybeSingle()
      : Promise.resolve({ data: null });

    const [
      membershipRes,
      domainsRes,
      winesRes,
      accessRequestRes,
      pendingPaymentRes,
      completedPaymentRes,
    ] = await Promise.all([
      membershipPromise,
      domainsPromise,
      winesPromise,
      accessRequestPromise,
      pendingPaymentPromise,
      completedPaymentPromise,
    ]);

    // Déterminer le rôle et l'accès
    if (isOrganizer) {
      isMember = true;
      hasConfidentialAccess = true;
      userRole = 'organizer';
    } else if (membershipRes.data) {
      isMember = true;
      hasConfidentialAccess = true;
      userRole = membershipRes.data.role;
    }

    // Événement privé sans token et sans membership → 403
    if (!isPublic && !hasValidToken && !isMember) {
      return new Response(
        JSON.stringify({ error: 'Accès refusé - token requis', code: 403 }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch refund request si paiement completed existe
    let hasPendingRefundRequest = false;
    if (authUser && completedPaymentRes.data) {
      const { data: refundReq } = await supabase
        .from('event_refund_request')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', authUser.id)
        .eq('status', 'pending')
        .maybeSingle();
      hasPendingRefundRequest = !!refundReq;
    }

    // Construire domainsWithWines
    const domainsData = domainsRes.data || [];
    const winesData = winesRes.data || [];

    // Grouper les vins par domain_id
    const winesByDomain: Record<string, any[]> = {};
    for (const item of winesData) {
      if (!winesByDomain[item.domain_id]) winesByDomain[item.domain_id] = [];
      if (item.wine) winesByDomain[item.domain_id].push(item.wine);
    }

    const domainsWithWines = domainsData.map((ed: any) => ({
      domain: ed.domain || { id: ed.domain_id, name: 'Inconnu', logo_url: null, region: null, slug: null },
      wines: winesByDomain[ed.domain_id] || [],
    }));

    // Construire la réponse avec masquage conditionnel
    const applyMasking = !hasConfidentialAccess;
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

    // Posts publics pour non-membres
    let publicPosts: any[] = [];
    if (!hasConfidentialAccess) {
      const { data: posts } = await supabase
        .from('event_post')
        .select('id, event_id, author_id, content, image_url, visibility, created_at, updated_at, likes_count, comment_count')
        .eq('event_id', eventId)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(50);
      publicPosts = posts || [];
    }

    // Calculer hasAccess
    const hasAccess = isMember || (isPublic && !!membershipRes.data);

    const responseData = {
      event: safeEventData,
      hasHiddenContactInfo,
      hasHiddenAddress,
      // Données utilisateur
      userRole,
      hasAccess,
      hasAccessRequest: !!accessRequestRes.data,
      accessRequestStatus: accessRequestRes.data?.status || null,
      hasPendingPayment: !!pendingPaymentRes.data,
      userPaymentAmount: completedPaymentRes.data ? Number(completedPaymentRes.data.amount) : null,
      hasPendingRefundRequest,
      // Domaines et vins
      domainsWithWines,
      // Posts publics (pour non-membres)
      ...(publicPosts.length > 0 ? { publicPosts } : {}),
    };

    return new Response(
      JSON.stringify(responseData),
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
