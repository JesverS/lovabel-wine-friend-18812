-- Corriger search_wines : jointure wine_type et bug domain jsonb
CREATE OR REPLACE FUNCTION public.search_wines(query text)
 RETURNS TABLE(id uuid, name text, year integer, label_url text, domain jsonb, wine_type jsonb)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  normalized_query text;
BEGIN
  normalized_query := extensions.unaccent(lower(trim(query)));
  
  RETURN QUERY
  SELECT 
    w.id,
    w.name,
    w.year,
    w.label_url,
    jsonb_build_object(
      'id', d.id,
      'name', d.name,
      'logo_url', d.logo_url,
      'region', d.region
    ) as domain,
    jsonb_build_object(
      'id', wt.id,
      'type', wt.type
    ) as wine_type
  FROM wine w
  LEFT JOIN domain d ON w.domain_id = d.id
  LEFT JOIN wine_type wt ON w.type = wt.id
  WHERE 
    w.is_playable = true
    AND (
      extensions.unaccent(lower(w.name)) ILIKE '%' || normalized_query || '%'
      OR extensions.unaccent(lower(d.name)) ILIKE '%' || normalized_query || '%'
      OR (wt.type IS NOT NULL AND extensions.unaccent(lower(wt.type::text)) ILIKE '%' || normalized_query || '%')
    )
  ORDER BY 
    CASE 
      WHEN extensions.unaccent(lower(w.name)) ILIKE normalized_query || '%' THEN 1
      WHEN extensions.unaccent(lower(d.name)) ILIKE normalized_query || '%' THEN 2
      ELSE 3
    END,
    w.created_at DESC
  LIMIT 20;
END;
$function$;

-- Corriger search_wines_game : jointure wine_type
CREATE OR REPLACE FUNCTION public.search_wines_game(query text)
 RETURNS TABLE(id uuid, name text, year integer, label_url text, domain jsonb, wine_type jsonb)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  normalized_query text;
BEGIN
  normalized_query := extensions.unaccent(lower(trim(query)));
  
  RETURN QUERY
  SELECT 
    w.id,
    w.name,
    w.year,
    w.label_url,
    jsonb_build_object(
      'id', d.id,
      'name', d.name,
      'logo_url', d.logo_url,
      'region', d.region
    ) as domain,
    jsonb_build_object(
      'id', wt.id,
      'type', wt.type
    ) as wine_type
  FROM wine w
  LEFT JOIN domain d ON w.domain_id = d.id
  LEFT JOIN wine_type wt ON w.type = wt.id
  WHERE 
    w.is_playable = true
    AND (
      extensions.unaccent(lower(w.name)) ILIKE '%' || normalized_query || '%'
      OR extensions.unaccent(lower(d.name)) ILIKE '%' || normalized_query || '%'
    )
  ORDER BY 
    CASE 
      WHEN extensions.unaccent(lower(w.name)) ILIKE normalized_query || '%' THEN 1
      WHEN extensions.unaccent(lower(d.name)) ILIKE normalized_query || '%' THEN 2
      ELSE 3
    END,
    w.created_at DESC
  LIMIT 20;
END;
$function$;