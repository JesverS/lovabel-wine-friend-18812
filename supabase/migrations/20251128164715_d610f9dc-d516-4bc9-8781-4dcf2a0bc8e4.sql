-- Créer la fonction RPC pour rechercher les vins d'une cave avec tous les filtres
CREATE OR REPLACE FUNCTION search_cellar_wines(
  p_cellar_id uuid,
  p_search_query text DEFAULT NULL,
  p_wine_type_id integer DEFAULT NULL,
  p_mode_culture_id integer DEFAULT NULL,
  p_classification_id integer DEFAULT NULL,
  p_domain_id uuid DEFAULT NULL,
  p_sort_by text DEFAULT 'added_at',
  p_sort_order text DEFAULT 'desc',
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 20
)
RETURNS TABLE(
  wine_id uuid,
  cellar_id uuid,
  added_at timestamp without time zone,
  description text,
  label_url text,
  price numeric,
  quantity integer,
  domain_id uuid,
  wine_data jsonb,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized_query text;
BEGIN
  -- Normaliser la requête de recherche
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
      -- Filtre par type de vin
      AND (p_wine_type_id IS NULL OR w.type = p_wine_type_id)
      -- Filtre par mode de culture
      AND (p_mode_culture_id IS NULL OR w.mode_culture = p_mode_culture_id)
      -- Filtre par classification
      AND (p_classification_id IS NULL OR w.wine_classification = p_classification_id)
      -- Filtre par domaine
      AND (p_domain_id IS NULL OR w.domain_id = p_domain_id)
      -- Filtre par recherche textuelle (nom vin, domaine, année)
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
$$;