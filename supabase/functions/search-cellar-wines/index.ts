import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { corsHeaders } from '../_shared/cors.ts';

interface SearchCellarWinesRequest {
  cellarId: string;
  searchQuery?: string;
  wineTypeId?: number;
  modeCultureId?: number;
  classificationId?: number;
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      cellarId,
      searchQuery,
      wineTypeId,
      modeCultureId,
      classificationId,
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
      sortBy,
      sortOrder,
      offset,
      limit,
    });

    // Construire la requête de base
    let query = supabaseClient
      .from('cellar_wine')
      .select(
        `
          *,
          wine:wine_id (
            id,
            name,
            year,
            label_url,
            domain_id,
            type,
            mode_culture,
            wine_classification,
            price,
            volume_ml,
            website_order_url,
            description,
            domain:domain_id (
              name
            )
          )
        `,
        { count: 'exact' }
      )
      .eq('cellar_id', cellarId);

    // Filtrer par type de vin
    if (wineTypeId) {
      query = query.eq('wine.type', wineTypeId);
    }

    // Filtrer par mode de culture
    if (modeCultureId) {
      query = query.eq('wine.mode_culture', modeCultureId);
    }

    // Filtrer par classification
    if (classificationId) {
      query = query.eq('wine.wine_classification', classificationId);
    }

    // Ajouter le tri
    switch (sortBy) {
      case 'name':
        query = query.order('wine.name', { ascending: sortOrder === 'asc' });
        break;
      case 'year':
        query = query.order('wine.year', { ascending: sortOrder === 'asc' });
        break;
      case 'domain':
        query = query.order('wine.domain.name', { ascending: sortOrder === 'asc' });
        break;
      case 'price':
        query = query.order('price', { ascending: sortOrder === 'asc' });
        break;
      case 'added_at':
      default:
        query = query.order('added_at', { ascending: sortOrder === 'asc' });
        break;
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    // Exécuter la requête
    const { data: wines, error, count } = await query;

    if (error) {
      console.error('Error fetching cellar wines:', error);
      throw error;
    }

    // Filtrage textuel côté application (car les relations imbriquées ne supportent pas or())
    let filteredWines = wines || [];
    
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filteredWines = filteredWines.filter((wine: any) => {
        const wineName = wine.wine?.name?.toLowerCase() || '';
        const domainName = wine.wine?.domain?.name?.toLowerCase() || '';
        const wineYear = wine.wine?.year?.toString() || '';
        
        return (
          wineName.includes(query) ||
          domainName.includes(query) ||
          wineYear.includes(query)
        );
      });
    }

    // Enrichir avec wine_type
    const { data: wineTypes } = await supabaseClient
      .from('wine_type')
      .select('id, type');

    const wineTypesMap = (wineTypes || []).reduce(
      (acc: Record<number, string>, type: any) => {
        acc[type.id] = type.type;
        return acc;
      },
      {} as Record<number, string>
    );

    const enrichedWines = filteredWines.map((item: any) => ({
      ...item,
      wine: {
        ...item.wine,
        wine_type:
          item.wine?.type && wineTypesMap[item.wine.type]
            ? { type: wineTypesMap[item.wine.type] }
            : null,
      },
    }));

    // Calculer hasMore
    const hasMore = enrichedWines.length === limit && (count ? offset + enrichedWines.length < count : true);

    console.log('Search results:', {
      winesCount: enrichedWines.length,
      totalCount: count,
      hasMore,
    });

    return new Response(
      JSON.stringify({
        wines: enrichedWines,
        totalCount: count,
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
