-- Correction de la fonction search_cellar_wines avec les bons noms de colonnes
CREATE OR REPLACE FUNCTION public.search_cellar_wines(
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
RETURNS TABLE (
  wine_id uuid,
  cellar_id uuid,
  added_at timestamptz,
  description text,
  label_url text,
  price numeric,
  quantity integer,
  domain_id uuid,
  wine_data jsonb,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_total_count bigint;
  v_search_normalized text;
BEGIN
  -- Normaliser la requête de recherche
  IF p_search_query IS NOT NULL AND p_search_query != '' THEN
    v_search_normalized := extensions.unaccent(lower(trim(p_search_query)));
  END IF;

  -- Compter le total des résultats
  SELECT COUNT(DISTINCT cw.wine_id) INTO v_total_count
  FROM cellar_wine cw
  JOIN wine w ON w.id = cw.wine_id
  LEFT JOIN domain d ON d.id = w.domain_id
  WHERE cw.cellar_id = p_cellar_id
    AND (
      v_search_normalized IS NULL
      OR extensions.unaccent(lower(w.name)) ILIKE '%' || v_search_normalized || '%'
      OR extensions.unaccent(lower(COALESCE(d.name, ''))) ILIKE '%' || v_search_normalized || '%'
      OR w.year::text ILIKE '%' || v_search_normalized || '%'
    )
    AND (p_wine_type_id IS NULL OR w.type = p_wine_type_id)
    AND (p_mode_culture_id IS NULL OR w.mode_culture = p_mode_culture_id)
    AND (p_classification_id IS NULL OR w.wine_classification = p_classification_id)
    AND (p_domain_id IS NULL OR w.domain_id = p_domain_id);

  -- Retourner les résultats paginés
  RETURN QUERY
  SELECT 
    cw.wine_id,
    cw.cellar_id,
    cw.added_at,
    cw.description,
    cw.label_url,
    cw.price,
    cw.quantity,
    w.domain_id,
    jsonb_build_object(
      'id', w.id,
      'name', w.name,
      'normalized_name', w.normalized_name,
      'year', w.year,
      'type', w.type,
      'mode_culture', w.mode_culture,
      'wine_classification', w.wine_classification,
      'wine_type_id', w.type,
      'mode_culture_id', w.mode_culture,
      'classification_id', w.wine_classification,
      'region', w.region,
      'appellation', w.appellation,
      'cepage', w.cepage,
      'label_url', w.label_url,
      'domain_id', w.domain_id,
      'wine_type', CASE WHEN wt.id IS NOT NULL THEN jsonb_build_object('id', wt.id, 'name', wt.name, 'color', wt.color) ELSE NULL END,
      'mode_culture_data', CASE WHEN mc.id IS NOT NULL THEN jsonb_build_object('id', mc.id, 'name', mc.name) ELSE NULL END,
      'classification_data', CASE WHEN cl.id IS NOT NULL THEN jsonb_build_object('id', cl.id, 'name', cl.name) ELSE NULL END,
      'domain', CASE WHEN d.id IS NOT NULL THEN jsonb_build_object('id', d.id, 'name', d.name, 'logo_url', d.logo_url, 'slug', d.slug) ELSE NULL END
    ) as wine_data,
    v_total_count as total_count
  FROM cellar_wine cw
  JOIN wine w ON w.id = cw.wine_id
  LEFT JOIN domain d ON d.id = w.domain_id
  LEFT JOIN wine_type wt ON wt.id = w.type
  LEFT JOIN mode_culture mc ON mc.id = w.mode_culture
  LEFT JOIN classification cl ON cl.id = w.wine_classification
  WHERE cw.cellar_id = p_cellar_id
    AND (
      v_search_normalized IS NULL
      OR extensions.unaccent(lower(w.name)) ILIKE '%' || v_search_normalized || '%'
      OR extensions.unaccent(lower(COALESCE(d.name, ''))) ILIKE '%' || v_search_normalized || '%'
      OR w.year::text ILIKE '%' || v_search_normalized || '%'
    )
    AND (p_wine_type_id IS NULL OR w.type = p_wine_type_id)
    AND (p_mode_culture_id IS NULL OR w.mode_culture = p_mode_culture_id)
    AND (p_classification_id IS NULL OR w.wine_classification = p_classification_id)
    AND (p_domain_id IS NULL OR w.domain_id = p_domain_id)
  ORDER BY
    CASE WHEN p_sort_by = 'added_at' AND p_sort_order = 'desc' THEN cw.added_at END DESC,
    CASE WHEN p_sort_by = 'added_at' AND p_sort_order = 'asc' THEN cw.added_at END ASC,
    CASE WHEN p_sort_by = 'name' AND p_sort_order = 'desc' THEN w.name END DESC,
    CASE WHEN p_sort_by = 'name' AND p_sort_order = 'asc' THEN w.name END ASC,
    CASE WHEN p_sort_by = 'year' AND p_sort_order = 'desc' THEN w.year END DESC,
    CASE WHEN p_sort_by = 'year' AND p_sort_order = 'asc' THEN w.year END ASC,
    CASE WHEN p_sort_by = 'price' AND p_sort_order = 'desc' THEN cw.price END DESC,
    CASE WHEN p_sort_by = 'price' AND p_sort_order = 'asc' THEN cw.price END ASC
  OFFSET p_offset
  LIMIT p_limit;
END;
$$;