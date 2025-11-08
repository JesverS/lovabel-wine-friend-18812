-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Drop existing search_wines function
DROP FUNCTION IF EXISTS public.search_wines(text);

-- Create updated search_wines function with accent and case insensitivity
CREATE OR REPLACE FUNCTION public.search_wines(query text)
RETURNS TABLE(
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
  domain jsonb,
  wine_type jsonb,
  wine_classification jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    unaccent(lower(wine.name)) % unaccent(lower(query))
    OR unaccent(lower(domain.name)) % unaccent(lower(query))
    OR unaccent(lower(CAST(wine.year AS TEXT))) LIKE unaccent(lower('%' || query || '%'))
    OR unaccent(lower(wine_type.type::text)) % unaccent(lower(query))
    OR unaccent(lower(wine_classification.nom)) % unaccent(lower(query))
  ORDER BY 
    GREATEST(
      similarity(unaccent(lower(wine.name)), unaccent(lower(query))), 
      similarity(unaccent(lower(domain.name)), unaccent(lower(query))),
      COALESCE(similarity(unaccent(lower(wine_type.type::text)), unaccent(lower(query))), 0),
      COALESCE(similarity(unaccent(lower(wine_classification.nom)), unaccent(lower(query))), 0)
    ) DESC,
    wine.year DESC
  LIMIT 50;
END;
$function$;

-- Add GIN trigram indexes for optimized fuzzy search
CREATE INDEX IF NOT EXISTS idx_wine_name_gin_trgm ON wine USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_domain_name_gin_trgm ON domain USING gin (name gin_trgm_ops);