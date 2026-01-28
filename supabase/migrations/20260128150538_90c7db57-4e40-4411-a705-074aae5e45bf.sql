-- Convertir wine.type de ENUM vers TEXT

-- 1. Supprimer les fonctions existantes qui utilisent l'ancienne colonne
DROP FUNCTION IF EXISTS search_wines(text);
DROP FUNCTION IF EXISTS search_wines_game(text);

-- 2. Ajouter une nouvelle colonne texte
ALTER TABLE wine ADD COLUMN IF NOT EXISTS type_text TEXT;

-- 3. Copier les données existantes
UPDATE wine SET type_text = type::text WHERE type IS NOT NULL;

-- 4. Supprimer l'ancienne colonne enum
ALTER TABLE wine DROP COLUMN IF EXISTS type;

-- 5. Renommer la nouvelle colonne
ALTER TABLE wine RENAME COLUMN type_text TO type;

-- 6. Recréer la fonction search_wines
CREATE OR REPLACE FUNCTION search_wines(query text)
RETURNS TABLE (
  id uuid,
  name text,
  year integer,
  label_url text,
  domain jsonb,
  wine_type jsonb
)
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
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
      'id', wt.id,
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
  LEFT JOIN wine_type wt ON w.type = wt.type::text
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
$$;

-- 7. Recréer la fonction search_wines_game
CREATE OR REPLACE FUNCTION search_wines_game(query text)
RETURNS TABLE (
  id uuid,
  name text,
  year integer,
  label_url text,
  domain jsonb,
  wine_type jsonb
)
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
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
  LEFT JOIN wine_type wt ON w.type = wt.type::text
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
$$;