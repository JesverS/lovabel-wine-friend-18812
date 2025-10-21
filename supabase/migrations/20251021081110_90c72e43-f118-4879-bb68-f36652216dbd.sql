-- Create function to search domains using trigram similarity
CREATE OR REPLACE FUNCTION public.search_domains(query text)
RETURNS TABLE(
  id uuid,
  name text,
  logo_url text,
  description text,
  website_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    domain.id,
    domain.name,
    domain.logo_url,
    domain.description,
    domain.website_url
  FROM domain
  WHERE 
    domain.name % query
  ORDER BY 
    similarity(domain.name, query) DESC
  LIMIT 20;
END;
$$;