
DROP FUNCTION IF EXISTS public.get_user_tastings_with_location(uuid, text);

CREATE FUNCTION public.get_user_tastings_with_location(
  p_user_id uuid,
  p_source_filter text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  wine_id uuid,
  wine_name text,
  wine_year smallint,
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
  JOIN event_domain_wine edw ON edw.wine_id = w.id AND edw.event_id = uwn.source_id
  JOIN event e ON e.id = uwn.source_id
  WHERE uwn.user_id = p_user_id
    AND uwn.source_type = 'event'
    AND e.latitude IS NOT NULL
    AND e.longitude IS NOT NULL
    AND (p_source_filter IS NULL OR p_source_filter = 'event')

  UNION ALL

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
  JOIN cellar c ON c.id = uwn.source_id
  WHERE uwn.user_id = p_user_id
    AND uwn.source_type = 'cellar'
    AND c.latitude IS NOT NULL
    AND c.longitude IS NOT NULL
    AND (p_source_filter IS NULL OR p_source_filter = 'cellar')

  UNION ALL

  SELECT
    uwn.id,
    uwn.wine_id,
    w.name AS wine_name,
    w.year AS wine_year,
    d.name AS domain_name,
    uwn.created_at,
    up.latitude,
    up.longitude,
    'spontaneous'::text AS source_type,
    'Dégustation spontanée'::text AS source_name,
    NULL::uuid AS source_id,
    uwn.liked
  FROM user_wine_notice uwn
  JOIN wine w ON w.id = uwn.wine_id
  JOIN domain d ON d.id = w.domain_id
  JOIN user_profiles up ON up.id = uwn.user_id
  WHERE uwn.user_id = p_user_id
    AND uwn.source_type = 'spontaneous'
    AND up.latitude IS NOT NULL
    AND up.longitude IS NOT NULL
    AND (p_source_filter IS NULL OR p_source_filter = 'spontaneous')

  ORDER BY created_at DESC;
END;
$$;
