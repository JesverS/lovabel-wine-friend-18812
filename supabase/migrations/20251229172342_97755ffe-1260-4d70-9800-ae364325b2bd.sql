-- D'abord supprimer les 3 fonctions existantes
DROP FUNCTION IF EXISTS public.search_wines(text);
DROP FUNCTION IF EXISTS public.search_cellar_wines(uuid, text, integer, integer, integer, uuid, text, text, integer, integer);
DROP FUNCTION IF EXISTS public.get_user_tastings_with_location(uuid, text);

-- 1. Recréer search_wines avec timestamptz
CREATE OR REPLACE FUNCTION public.search_wines(query text)
 RETURNS TABLE(id uuid, name text, year integer, volume_ml integer, price real, description text, label_url text, website_order_url text, domain_id uuid, alcohol_percentage numeric, characteristics jsonb, created_at timestamp with time zone, updated_at timestamp with time zone, domain jsonb, wine_type jsonb, wine_classification jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$DECLARE
  normalized_query TEXT := unaccent(lower(query));
BEGIN
  RETURN QUERY
  SELECT 
    wine.id,
    wine.name,
    wine.year,
    wine.volume_ml,
    wine.price,
    wine.description,
    wine.label_url,
    wine.website_order_url,
    wine.domain_id,
    wine.alcohol_percentage,
    wine.characteristics,
    wine.created_at,
    wine.updated_at,
    jsonb_build_object(
      'id', domain.id,
      'name', domain.name,
      'logo_url', domain.logo_url
    ) as domain,
    jsonb_build_object(
      'id', wine_type.id,
      'type', wine_type.type
    ) as wine_type,
    jsonb_build_object(
      'id', wine_classification.id,
      'nom', wine_classification.nom,
      'region', wine_classification.region
    ) as wine_classification
  FROM wine
  JOIN domain ON wine.domain_id = domain.id
  LEFT JOIN wine_type ON wine.type = wine_type.id
  LEFT JOIN wine_classification ON wine.wine_classification = wine_classification.id
  WHERE 
      wine.normalized_name % normalized_query
   OR domain.normalized_name % normalized_query
   OR wine.year::text ILIKE ('%' || query || '%')
   OR wine_type.normalized_type % normalized_query
   OR wine_classification.normalized_nom % normalized_query
  ORDER BY 
    GREATEST(
      similarity(wine.normalized_name, normalized_query), 
      similarity(domain.normalized_name, normalized_query),
      COALESCE(similarity(wine_type.normalized_type, normalized_query), 0),
      COALESCE(similarity(wine_classification.normalized_nom, normalized_query), 0)
    ) DESC,
    wine.year DESC
  LIMIT 50;
END;$function$;

-- 2. Recréer search_cellar_wines avec timestamptz
CREATE OR REPLACE FUNCTION public.search_cellar_wines(p_cellar_id uuid, p_search_query text DEFAULT NULL::text, p_wine_type_id integer DEFAULT NULL::integer, p_mode_culture_id integer DEFAULT NULL::integer, p_classification_id integer DEFAULT NULL::integer, p_domain_id uuid DEFAULT NULL::uuid, p_sort_by text DEFAULT 'added_at'::text, p_sort_order text DEFAULT 'desc'::text, p_offset integer DEFAULT 0, p_limit integer DEFAULT 20)
 RETURNS TABLE(wine_id uuid, cellar_id uuid, added_at timestamp with time zone, description text, label_url text, price numeric, quantity integer, domain_id uuid, wine_data jsonb, total_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_normalized_query text;
BEGIN
  IF p_search_query IS NOT NULL AND p_search_query != '' THEN
    v_normalized_query := unaccent(lower(trim(p_search_query)));
  END IF;

  RETURN QUERY
  WITH filtered_wines AS (
    SELECT 
      cw.wine_id,
      cw.cellar_id,
      cw.added_at,
      cw.description,
      cw.label_url,
      cw.price,
      cw.quantity,
      cw.domain_id,
      jsonb_build_object(
        'id', w.id,
        'name', w.name,
        'year', w.year,
        'label_url', w.label_url,
        'type', w.type,
        'mode_culture', w.mode_culture,
        'wine_classification', w.wine_classification,
        'price', w.price,
        'volume_ml', w.volume_ml,
        'website_order_url', w.website_order_url,
        'description', w.description,
        'domain', jsonb_build_object(
          'id', d.id,
          'name', d.name,
          'logo_url', d.logo_url
        ),
        'wine_type', CASE 
          WHEN wt.id IS NOT NULL THEN jsonb_build_object('id', wt.id, 'type', wt.type)
          ELSE NULL
        END,
        'wine_classification', CASE
          WHEN wc.id IS NOT NULL THEN jsonb_build_object('id', wc.id, 'nom', wc.nom)
          ELSE NULL
        END,
        'mode_culture', CASE
          WHEN mc.id IS NOT NULL THEN jsonb_build_object('id', mc.id, 'nom', mc.nom)
          ELSE NULL
        END
      ) as wine_data
    FROM cellar_wine cw
    JOIN wine w ON w.id = cw.wine_id
    LEFT JOIN domain d ON d.id = w.domain_id
    LEFT JOIN wine_type wt ON wt.id = w.type
    LEFT JOIN wine_classification wc ON wc.id = w.wine_classification
    LEFT JOIN mode_culture mc ON mc.id = w.mode_culture
    WHERE 
      cw.cellar_id = p_cellar_id
      AND (p_wine_type_id IS NULL OR w.type = p_wine_type_id)
      AND (p_mode_culture_id IS NULL OR w.mode_culture = p_mode_culture_id)
      AND (p_classification_id IS NULL OR w.wine_classification = p_classification_id)
      AND (p_domain_id IS NULL OR w.domain_id = p_domain_id)
      AND (
        v_normalized_query IS NULL OR
        w.normalized_name ILIKE '%' || v_normalized_query || '%' OR
        d.normalized_name ILIKE '%' || v_normalized_query || '%' OR
        w.year::text ILIKE '%' || p_search_query || '%'
      )
    ORDER BY
      CASE WHEN p_sort_by = 'name' AND p_sort_order = 'asc' THEN w.name END ASC,
      CASE WHEN p_sort_by = 'name' AND p_sort_order = 'desc' THEN w.name END DESC,
      CASE WHEN p_sort_by = 'year' AND p_sort_order = 'asc' THEN w.year END ASC,
      CASE WHEN p_sort_by = 'year' AND p_sort_order = 'desc' THEN w.year END DESC,
      CASE WHEN p_sort_by = 'domain' AND p_sort_order = 'asc' THEN d.name END ASC,
      CASE WHEN p_sort_by = 'domain' AND p_sort_order = 'desc' THEN d.name END DESC,
      CASE WHEN p_sort_by = 'price' AND p_sort_order = 'asc' THEN cw.price END ASC,
      CASE WHEN p_sort_by = 'price' AND p_sort_order = 'desc' THEN cw.price END DESC,
      CASE WHEN p_sort_by = 'added_at' AND p_sort_order = 'asc' THEN cw.added_at END ASC,
      CASE WHEN p_sort_by = 'added_at' AND p_sort_order = 'desc' THEN cw.added_at END DESC,
      cw.added_at DESC
    OFFSET p_offset
    LIMIT p_limit
  ),
  total AS (
    SELECT COUNT(*) as cnt
    FROM cellar_wine cw
    JOIN wine w ON w.id = cw.wine_id
    LEFT JOIN domain d ON d.id = w.domain_id
    WHERE 
      cw.cellar_id = p_cellar_id
      AND (p_wine_type_id IS NULL OR w.type = p_wine_type_id)
      AND (p_mode_culture_id IS NULL OR w.mode_culture = p_mode_culture_id)
      AND (p_classification_id IS NULL OR w.wine_classification = p_classification_id)
      AND (p_domain_id IS NULL OR w.domain_id = p_domain_id)
      AND (
        v_normalized_query IS NULL OR
        w.normalized_name ILIKE '%' || v_normalized_query || '%' OR
        d.normalized_name ILIKE '%' || v_normalized_query || '%' OR
        w.year::text ILIKE '%' || p_search_query || '%'
      )
  )
  SELECT 
    fw.*,
    (SELECT cnt FROM total) as total_count
  FROM filtered_wines fw;
END;
$function$;

-- 3. Recréer get_user_tastings_with_location avec timestamptz et SET search_path
CREATE OR REPLACE FUNCTION public.get_user_tastings_with_location(p_user_id uuid, p_source_filter text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, wine_id uuid, wine_name text, wine_year integer, domain_name text, created_at timestamp with time zone, latitude double precision, longitude double precision, source_type text, source_name text, source_id uuid, liked smallint, label_url text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH notice_events AS (
    SELECT ne.user_wine_notice_id, e.id as event_id, e.name as event_name, 
           e.latitude as event_lat, e.longitude as event_lng
    FROM user_wine_notice_event ne
    JOIN event e ON e.id = ne.event_id
  ),
  notice_cellars AS (
    SELECT nc.user_wine_notice_id, c.id as cellar_id, c.name as cellar_name,
           c.latitude as cellar_lat, c.longitude as cellar_lng
    FROM user_wine_notice_cellar nc
    JOIN cellar c ON c.id = nc.cellar_id
  )
  SELECT 
    uwn.id,
    uwn.wine_id,
    w.name::text as wine_name,
    w.year as wine_year,
    d.name::text as domain_name,
    uwn.created_at,
    COALESCE(ne.event_lat, nc.cellar_lat, uwn.latitude) as latitude,
    COALESCE(ne.event_lng, nc.cellar_lng, uwn.longitude) as longitude,
    CASE 
      WHEN ne.event_id IS NOT NULL THEN 'event'
      WHEN nc.cellar_id IS NOT NULL THEN 'cellar'
      WHEN uwn.spontaneous = true THEN 'spontaneous'
      ELSE 'unknown'
    END::text as source_type,
    COALESCE(ne.event_name, nc.cellar_name, 'Lieu spontané')::text as source_name,
    COALESCE(ne.event_id, nc.cellar_id)::uuid as source_id,
    uwn.liked,
    w.label_url::text as label_url
  FROM user_wine_notice uwn
  JOIN wine w ON w.id = uwn.wine_id
  JOIN domain d ON d.id = w.domain_id
  LEFT JOIN notice_events ne ON ne.user_wine_notice_id = uwn.id
  LEFT JOIN notice_cellars nc ON nc.user_wine_notice_id = uwn.id
  WHERE uwn.user_id = p_user_id
    AND (
      COALESCE(ne.event_lat, nc.cellar_lat, uwn.latitude) IS NOT NULL
      AND COALESCE(ne.event_lng, nc.cellar_lng, uwn.longitude) IS NOT NULL
    )
    AND (p_source_filter IS NULL OR 
         (p_source_filter = 'event' AND ne.event_id IS NOT NULL) OR
         (p_source_filter = 'cellar' AND nc.cellar_id IS NOT NULL) OR
         (p_source_filter = 'spontaneous' AND uwn.spontaneous = true))
  ORDER BY uwn.created_at DESC;
END;
$function$;