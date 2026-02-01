-- Create function to search similar domains using pg_trgm
CREATE OR REPLACE FUNCTION public.search_similar_domain(
  search_name text,
  threshold float DEFAULT 0.8
)
RETURNS TABLE(id uuid, name text, sim float)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT 
    d.id,
    d.name,
    extensions.similarity(
      extensions.unaccent(lower(d.name)), 
      extensions.unaccent(lower(search_name))
    ) as sim
  FROM domain d
  WHERE extensions.similarity(
    extensions.unaccent(lower(d.name)), 
    extensions.unaccent(lower(search_name))
  ) > threshold
  ORDER BY sim DESC
  LIMIT 1;
$$;

-- Create function to search similar appellations using pg_trgm
CREATE OR REPLACE FUNCTION public.search_similar_appellation(
  search_name text,
  threshold float DEFAULT 0.8
)
RETURNS TABLE(id integer, nom text, sim float)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT 
    a.id,
    a.nom,
    extensions.similarity(
      COALESCE(a.normalized_nom, extensions.unaccent(lower(a.nom))), 
      extensions.unaccent(lower(search_name))
    ) as sim
  FROM appellation a
  WHERE extensions.similarity(
    COALESCE(a.normalized_nom, extensions.unaccent(lower(a.nom))), 
    extensions.unaccent(lower(search_name))
  ) > threshold
  ORDER BY sim DESC
  LIMIT 1;
$$;