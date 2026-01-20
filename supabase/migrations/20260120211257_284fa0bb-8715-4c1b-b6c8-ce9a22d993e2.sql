-- =============================================
-- MIGRATION: Recréer les index GIN et corriger les fonctions de recherche
-- =============================================

-- 1. RECRÉER LES 3 INDEX GIN SUPPRIMÉS

CREATE INDEX IF NOT EXISTS idx_wine_name_gin_trgm 
ON wine USING gin (name extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_domain_name_gin_trgm 
ON domain USING gin (name extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_domain_description_gin_trgm 
ON domain USING gin (description extensions.gin_trgm_ops);

-- 2. CORRIGER LA FONCTION search_domains

CREATE OR REPLACE FUNCTION public.search_domains(query text)
RETURNS TABLE(
  id uuid,
  name text,
  logo_url text,
  description text,
  website_url text,
  region text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    domain.id,
    domain.name,
    domain.logo_url,
    domain.description,
    domain.website_url,
    domain.region::text
  FROM domain
  WHERE 
    extensions.unaccent(lower(domain.name)) OPERATOR(extensions.%) extensions.unaccent(lower(query))
    OR extensions.unaccent(lower(COALESCE(domain.description, ''))) OPERATOR(extensions.%) extensions.unaccent(lower(query))
    OR extensions.unaccent(lower(COALESCE(domain.region::text, ''))) OPERATOR(extensions.%) extensions.unaccent(lower(query))
  ORDER BY 
    GREATEST(
      extensions.similarity(extensions.unaccent(lower(domain.name)), extensions.unaccent(lower(query))),
      COALESCE(extensions.similarity(extensions.unaccent(lower(COALESCE(domain.description, ''))), extensions.unaccent(lower(query))), 0),
      COALESCE(extensions.similarity(extensions.unaccent(lower(COALESCE(domain.region::text, ''))), extensions.unaccent(lower(query))), 0)
    ) DESC
  LIMIT 50;
END;
$function$;

-- 3. CRÉER LE TRIGGER MANQUANT SUR wine_type

DROP TRIGGER IF EXISTS trg_wine_type_normalize_type ON wine_type;

CREATE TRIGGER trg_wine_type_normalize_type
  BEFORE INSERT OR UPDATE ON wine_type
  FOR EACH ROW
  EXECUTE FUNCTION wine_type_normalize_type();

-- Initialiser les données existantes (cast type::text pour l'enum)
UPDATE wine_type 
SET normalized_type = extensions.unaccent(lower(type::text)) 
WHERE normalized_type IS NULL OR normalized_type = '';

-- 4. CORRIGER LA FONCTION search_cellar_wines

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
RETURNS TABLE(
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
AS $function$
DECLARE
  v_total_count bigint;
  v_search_normalized text;
BEGIN
  -- Normaliser la recherche
  IF p_search_query IS NOT NULL AND p_search_query <> '' THEN
    v_search_normalized := extensions.unaccent(lower(p_search_query));
  END IF;

  -- Compter le total
  SELECT COUNT(*)
  INTO v_total_count
  FROM cellar_wine cw
  JOIN wine w ON w.id = cw.wine_id
  LEFT JOIN domain d ON d.id = w.domain_id
  WHERE cw.cellar_id = p_cellar_id
    AND (p_search_query IS NULL OR p_search_query = '' OR (
      extensions.unaccent(lower(w.name)) LIKE '%' || v_search_normalized || '%'
      OR extensions.unaccent(lower(COALESCE(d.name, ''))) LIKE '%' || v_search_normalized || '%'
      OR w.year::text LIKE '%' || p_search_query || '%'
    ))
    AND (p_wine_type_id IS NULL OR w.wine_type_id = p_wine_type_id)
    AND (p_mode_culture_id IS NULL OR w.mode_culture_id = p_mode_culture_id)
    AND (p_classification_id IS NULL OR w.classification_id = p_classification_id)
    AND (p_domain_id IS NULL OR w.domain_id = p_domain_id);

  -- Retourner les résultats
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
      'year', w.year,
      'wine_type_id', w.wine_type_id,
      'mode_culture_id', w.mode_culture_id,
      'classification_id', w.classification_id,
      'domain_id', w.domain_id,
      'domain', CASE WHEN d.id IS NOT NULL THEN jsonb_build_object(
        'id', d.id,
        'name', d.name,
        'logo_url', d.logo_url,
        'region', d.region
      ) ELSE NULL END,
      'wine_type', CASE WHEN wt.id IS NOT NULL THEN jsonb_build_object(
        'id', wt.id,
        'type', wt.type
      ) ELSE NULL END,
      'mode_culture', CASE WHEN mc.id IS NOT NULL THEN jsonb_build_object(
        'id', mc.id,
        'culture', mc.culture
      ) ELSE NULL END,
      'classification', CASE WHEN cl.id IS NOT NULL THEN jsonb_build_object(
        'id', cl.id,
        'classification', cl.classification
      ) ELSE NULL END
    ) as wine_data,
    v_total_count as total_count
  FROM cellar_wine cw
  JOIN wine w ON w.id = cw.wine_id
  LEFT JOIN domain d ON d.id = w.domain_id
  LEFT JOIN wine_type wt ON wt.id = w.wine_type_id
  LEFT JOIN mode_culture mc ON mc.id = w.mode_culture_id
  LEFT JOIN classification cl ON cl.id = w.classification_id
  WHERE cw.cellar_id = p_cellar_id
    AND (p_search_query IS NULL OR p_search_query = '' OR (
      extensions.unaccent(lower(w.name)) LIKE '%' || v_search_normalized || '%'
      OR extensions.unaccent(lower(COALESCE(d.name, ''))) LIKE '%' || v_search_normalized || '%'
      OR w.year::text LIKE '%' || p_search_query || '%'
    ))
    AND (p_wine_type_id IS NULL OR w.wine_type_id = p_wine_type_id)
    AND (p_mode_culture_id IS NULL OR w.mode_culture_id = p_mode_culture_id)
    AND (p_classification_id IS NULL OR w.classification_id = p_classification_id)
    AND (p_domain_id IS NULL OR w.domain_id = p_domain_id)
  ORDER BY
    CASE WHEN p_sort_by = 'added_at' AND p_sort_order = 'desc' THEN cw.added_at END DESC,
    CASE WHEN p_sort_by = 'added_at' AND p_sort_order = 'asc' THEN cw.added_at END ASC,
    CASE WHEN p_sort_by = 'name' AND p_sort_order = 'desc' THEN w.name END DESC,
    CASE WHEN p_sort_by = 'name' AND p_sort_order = 'asc' THEN w.name END ASC,
    CASE WHEN p_sort_by = 'year' AND p_sort_order = 'desc' THEN w.year END DESC,
    CASE WHEN p_sort_by = 'year' AND p_sort_order = 'asc' THEN w.year END ASC,
    CASE WHEN p_sort_by = 'quantity' AND p_sort_order = 'desc' THEN cw.quantity END DESC,
    CASE WHEN p_sort_by = 'quantity' AND p_sort_order = 'asc' THEN cw.quantity END ASC,
    CASE WHEN p_sort_by = 'price' AND p_sort_order = 'desc' THEN cw.price END DESC,
    CASE WHEN p_sort_by = 'price' AND p_sort_order = 'asc' THEN cw.price END ASC
  OFFSET p_offset
  LIMIT p_limit;
END;
$function$;