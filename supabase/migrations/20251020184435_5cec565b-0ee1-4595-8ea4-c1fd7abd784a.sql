-- Create function to search wines using trigram similarity
CREATE OR REPLACE FUNCTION search_wines(query text)
RETURNS TABLE (
  id uuid,
  name text,
  year integer,
  volume_ml integer,
  price numeric,
  description text,
  label_url text,
  uber_order_url text,
  website_order_url text,
  domain_id uuid,
  stock integer,
  alcohol_percentage numeric,
  characteristics jsonb,
  created_at timestamp,
  updated_at timestamp,
  domain jsonb
) AS $$
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
    wine.uber_order_url,
    wine.website_order_url,
    wine.domain_id,
    wine.stock,
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
$$ LANGUAGE plpgsql;