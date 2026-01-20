-- Correction de la fonction search_cellar_wines avec les vrais noms de tables et colonnes
CREATE OR REPLACE FUNCTION public.search_cellar_wines(
  p_cellar_id UUID,
  p_search_query TEXT DEFAULT NULL,
  p_wine_type_id INTEGER DEFAULT NULL,
  p_mode_culture_id INTEGER DEFAULT NULL,
  p_classification_id INTEGER DEFAULT NULL,
  p_domain_id UUID DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'added_at',
  p_sort_order TEXT DEFAULT 'desc',
  p_offset INTEGER DEFAULT 0,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  wine_id UUID,
  cellar_id UUID,
  added_at TIMESTAMPTZ,
  description TEXT,
  label_url TEXT,
  price NUMERIC,
  quantity INTEGER,
  domain_id UUID,
  wine_data JSONB,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_total_count BIGINT;
BEGIN
  -- Compter le total des résultats
  SELECT COUNT(*)
  INTO v_total_count
  FROM cellar_wine cw
  JOIN wine w ON w.id = cw.wine_id
  LEFT JOIN domain d ON d.id = w.domain_id
  WHERE cw.cellar_id = p_cellar_id
    AND (p_search_query IS NULL OR extensions.unaccent(LOWER(w.name)) LIKE '%' || extensions.unaccent(LOWER(p_search_query)) || '%' 
         OR (d.name IS NOT NULL AND extensions.unaccent(LOWER(d.name)) LIKE '%' || extensions.unaccent(LOWER(p_search_query)) || '%'))
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
      'cepages', w.cepages,
      'label_url', w.label_url,
      'domain_id', w.domain_id,
      'wine_type', CASE WHEN wt.id IS NOT NULL THEN jsonb_build_object('id', wt.id, 'type', wt.type) ELSE NULL END,
      'mode_culture_data', CASE WHEN mc.id IS NOT NULL THEN jsonb_build_object('id', mc.id, 'nom', mc.nom) ELSE NULL END,
      'classification_data', CASE WHEN cl.id IS NOT NULL THEN jsonb_build_object('id', cl.id, 'nom', cl.nom, 'region', cl.region) ELSE NULL END,
      'domain', CASE WHEN d.id IS NOT NULL THEN jsonb_build_object('id', d.id, 'name', d.name, 'logo_url', d.logo_url, 'slug', d.slug) ELSE NULL END
    ) AS wine_data,
    v_total_count AS total_count
  FROM cellar_wine cw
  JOIN wine w ON w.id = cw.wine_id
  LEFT JOIN wine_type wt ON wt.id = w.type
  LEFT JOIN mode_culture mc ON mc.id = w.mode_culture
  LEFT JOIN wine_classification cl ON cl.id = w.wine_classification
  LEFT JOIN domain d ON d.id = w.domain_id
  WHERE cw.cellar_id = p_cellar_id
    AND (p_search_query IS NULL OR extensions.unaccent(LOWER(w.name)) LIKE '%' || extensions.unaccent(LOWER(p_search_query)) || '%'
         OR (d.name IS NOT NULL AND extensions.unaccent(LOWER(d.name)) LIKE '%' || extensions.unaccent(LOWER(p_search_query)) || '%'))
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