
CREATE OR REPLACE FUNCTION public.search_existing_wine(
  search_name text,
  p_domain_id uuid,
  p_year integer
)
RETURNS TABLE(id uuid, name text, year integer, label_url text, sim float)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    w.id,
    w.name,
    w.year,
    w.label_url,
    extensions.similarity(
      COALESCE(w.normalized_name, extensions.unaccent(lower(w.name))),
      extensions.unaccent(lower(search_name))
    ) as sim
  FROM wine w
  WHERE w.domain_id = p_domain_id
    AND w.year = p_year
    AND extensions.similarity(
      COALESCE(w.normalized_name, extensions.unaccent(lower(w.name))),
      extensions.unaccent(lower(search_name))
    ) > 0.88
  ORDER BY sim DESC
  LIMIT 1;
$$;
