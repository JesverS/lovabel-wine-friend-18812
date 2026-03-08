
-- Fix type mismatch: wine_year was smallint but wine.year is integer
-- Also ensure only one function signature exists

DROP FUNCTION IF EXISTS public.get_user_tastings_with_location(uuid, text);

CREATE FUNCTION public.get_user_tastings_with_location(
  p_user_id uuid,
  p_source_filter text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  wine_id uuid,
  wine_name text,
  wine_year integer,
  domain_name text,
  created_at timestamptz,
  latitude double precision,
  longitude double precision,
  source_type text,
  source_name text,
  source_id uuid,
  liked smallint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY

  -- Event tastings
  SELECT
    uwn.id,
    uwn.wine_id,
    w.name AS wine_name,
    w.year AS wine_year,
    d.name AS domain_name,
    uwn.created_at,
    e.latitude,
    e.longitude,
    'event'::text AS source_type,
    e.name AS source_name,
    e.id AS source_id,
    uwn.liked
  FROM user_wine_notice uwn
  JOIN wine w ON w.id = uwn.wine_id
  JOIN domain d ON d.id = w.domain_id
  JOIN user_wine_notice_event uwne ON uwne.user_wine_notice_id = uwn.id
  JOIN event e ON e.id = uwne.event_id
  WHERE uwn.user_id = p_user_id
    AND e.latitude IS NOT NULL
    AND e.longitude IS NOT NULL
    AND (p_source_filter IS NULL OR p_source_filter = 'event')

  UNION ALL

  -- Cellar tastings
  SELECT
    uwn.id,
    uwn.wine_id,
    w.name AS wine_name,
    w.year AS wine_year,
    d.name AS domain_name,
    uwn.created_at,
    c.latitude,
    c.longitude,
    'cellar'::text AS source_type,
    c.name AS source_name,
    c.id AS source_id,
    uwn.liked
  FROM user_wine_notice uwn
  JOIN wine w ON w.id = uwn.wine_id
  JOIN domain d ON d.id = w.domain_id
  JOIN user_wine_notice_cellar uwnc ON uwnc.user_wine_notice_id = uwn.id
  JOIN cellar c ON c.id = uwnc.cellar_id
  WHERE uwn.user_id = p_user_id
    AND c.latitude IS NOT NULL
    AND c.longitude IS NOT NULL
    AND (p_source_filter IS NULL OR p_source_filter = 'cellar')

  UNION ALL

  -- Spontaneous tastings
  SELECT
    uwn.id,
    uwn.wine_id,
    w.name AS wine_name,
    w.year AS wine_year,
    d.name AS domain_name,
    uwn.created_at,
    uwn.latitude,
    uwn.longitude,
    'spontaneous'::text AS source_type,
    'Dégustation spontanée'::text AS source_name,
    NULL::uuid AS source_id,
    uwn.liked
  FROM user_wine_notice uwn
  JOIN wine w ON w.id = uwn.wine_id
  JOIN domain d ON d.id = w.domain_id
  WHERE uwn.user_id = p_user_id
    AND uwn.spontaneous = true
    AND uwn.latitude IS NOT NULL
    AND uwn.longitude IS NOT NULL
    AND (p_source_filter IS NULL OR p_source_filter = 'spontaneous')

  ORDER BY created_at DESC;
END;
$$;
