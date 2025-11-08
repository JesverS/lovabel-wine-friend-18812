-- Supprimer l'ancienne fonction search_wines
DROP FUNCTION IF EXISTS public.search_wines(text);

-- Recréer la fonction search_wines sans uber_order_url
CREATE OR REPLACE FUNCTION public.search_wines(query text)
RETURNS TABLE (
  id uuid,
  name text,
  year integer,
  volume_ml integer,
  price real,
  description text,
  label_url text,
  website_order_url text,
  domain_id uuid,
  alcohol_percentage numeric,
  characteristics jsonb,
  created_at timestamp without time zone,
  updated_at timestamp without time zone,
  domain jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    ) as domain
  FROM wine
  JOIN domain ON wine.domain_id = domain.id
  WHERE 
    wine.name % query
    OR domain.name % query
    OR CAST(wine.year AS TEXT) ILIKE '%' || query || '%'
  ORDER BY 
    GREATEST(similarity(wine.name, query), similarity(domain.name, query)) DESC,
    wine.year DESC
  LIMIT 50;
END;
$$;