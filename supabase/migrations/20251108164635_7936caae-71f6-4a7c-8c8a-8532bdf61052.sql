-- Drop existing search_domains function
DROP FUNCTION IF EXISTS public.search_domains(text);

-- Create updated search_domains function with accent and case insensitivity
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
SET search_path TO 'public'
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
    unaccent(lower(domain.name)) % unaccent(lower(query))
    OR unaccent(lower(COALESCE(domain.description, ''))) % unaccent(lower(query))
    OR unaccent(lower(COALESCE(domain.region::text, ''))) % unaccent(lower(query))
  ORDER BY 
    GREATEST(
      similarity(unaccent(lower(domain.name)), unaccent(lower(query))),
      COALESCE(similarity(unaccent(lower(COALESCE(domain.description, ''))), unaccent(lower(query))), 0),
      COALESCE(similarity(unaccent(lower(COALESCE(domain.region::text, ''))), unaccent(lower(query))), 0)
    ) DESC
  LIMIT 50;
END;
$function$;

-- Add GIN trigram index for optimized fuzzy search on domain description
CREATE INDEX IF NOT EXISTS idx_domain_description_gin_trgm ON domain USING gin (description gin_trgm_ops);