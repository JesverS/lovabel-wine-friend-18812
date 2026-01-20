import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { corsHeaders } from '../_shared/cors.ts';

interface SearchCellarWinesRequest {
  cellarId: string;
  searchQuery?: string;
  wineTypeId?: number;
  modeCultureId?: number;
  classificationId?: number;
  domainId?: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  offset: number;
  limit: number;
}

Deno.serve(async (req) => {
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

    // Client admin pour opérations DB (bypass RLS si nécessaire)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      cellarId,
      searchQuery,
      wineTypeId,
      modeCultureId,
      classificationId,
      domainId,
      sortBy,
      sortOrder,
      offset,
      limit,
    }: SearchCellarWinesRequest = await req.json();

    console.log('Search cellar wines request:', {
      cellarId,
      searchQuery,
      wineTypeId,
      modeCultureId,
      classificationId,
      domainId,
      sortBy,
      sortOrder,
      offset,
      limit,
      userId: user.id,
    });

    // Appeler la fonction RPC qui gère tout le filtrage en SQL
    const { data: results, error } = await supabaseAdmin.rpc('search_cellar_wines', {
      p_cellar_id: cellarId,
      p_search_query: searchQuery || null,
      p_wine_type_id: wineTypeId || null,
      p_mode_culture_id: modeCultureId || null,
      p_classification_id: classificationId || null,
      p_domain_id: domainId || null,
      p_sort_by: sortBy,
      p_sort_order: sortOrder,
      p_offset: offset,
      p_limit: limit,
    });

    if (error) {
      console.error('Error searching cellar wines:', error);
      throw error;
    }

    // Transformer les résultats de la RPC
    const wines = (results || []).map((row: any) => ({
      wine_id: row.wine_id,
      cellar_id: row.cellar_id,
      added_at: row.added_at,
      description: row.description,
      label_url: row.label_url,
      price: row.price,
      quantity: row.quantity,
      domain_id: row.domain_id,
      wine: row.wine_data,
    }));

    // Le total_count est le même pour toutes les lignes
    const totalCount = results && results.length > 0 ? results[0].total_count : 0;
    const hasMore = wines.length === limit;

    console.log('Search results:', {
      winesCount: wines.length,
      totalCount,
      hasMore,
    });

    return new Response(
      JSON.stringify({
        wines,
        totalCount,
        hasMore,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in search-cellar-wines function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
