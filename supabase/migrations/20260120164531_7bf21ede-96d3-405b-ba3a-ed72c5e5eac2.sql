-- =====================================================
-- MIGRATION: Extensions vers schéma 'extensions' + search_path
-- =====================================================

-- Étape 1: Déplacer les extensions vers le schéma 'extensions'
-- Note: pg_trgm et unaccent sont dans public, on les déplace

-- Supprimer et recréer pg_trgm dans extensions
DROP EXTENSION IF EXISTS pg_trgm CASCADE;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- Supprimer et recréer unaccent dans extensions
DROP EXTENSION IF EXISTS unaccent CASCADE;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

-- Étape 2: Mettre à jour le search_path de la base pour inclure 'extensions'
ALTER DATABASE postgres SET search_path TO public, extensions;

-- Étape 3: Recréer les fonctions triggers avec search_path correct
-- Chaque fonction utilise extensions.unaccent() explicitement

-- 3.1 domain_normalize_name
CREATE OR REPLACE FUNCTION public.domain_normalize_name()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, extensions
AS $function$
BEGIN
  NEW.normalized_name := extensions.unaccent(lower(NEW.name));
  RETURN NEW;
END;
$function$;

-- 3.2 wine_normalize_name
CREATE OR REPLACE FUNCTION public.wine_normalize_name()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, extensions
AS $function$
BEGIN
  NEW.normalized_name := extensions.unaccent(lower(NEW.name));
  RETURN NEW;
END;
$function$;

-- 3.3 wine_classification_normalize_nom
CREATE OR REPLACE FUNCTION public.wine_classification_normalize_nom()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, extensions
AS $function$
BEGIN
  NEW.normalized_nom := extensions.unaccent(lower(NEW.nom));
  RETURN NEW;
END;
$function$;

-- 3.4 wine_type_normalize_type
CREATE OR REPLACE FUNCTION public.wine_type_normalize_type()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, extensions
AS $function$
BEGIN
  NEW.normalized_type := extensions.unaccent(lower(NEW.type));
  RETURN NEW;
END;
$function$;

-- 3.5 search_wines_game - fonction de recherche fuzzy
CREATE OR REPLACE FUNCTION public.search_wines_game(query text)
RETURNS TABLE(id uuid, wine_name text, wine_year integer, domain_name text, similarity_score real)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $function$
  SELECT
    w.id,
    w.name as wine_name,
    w.year as wine_year,
    d.name as domain_name,
    (
      0.5 * extensions.similarity(w.name, query) +
      0.3 * extensions.similarity(d.name, query) +
      0.2 * extensions.similarity(w.year::text, query)
    ) as similarity_score
  FROM wine w
  JOIN domain d ON d.id = w.domain_id
  WHERE
    w.is_playable = true
    AND (
      w.name OPERATOR(extensions.%) query
      OR d.name OPERATOR(extensions.%) query
      OR w.year::text OPERATOR(extensions.%) query
    )
  ORDER BY similarity_score DESC
  LIMIT 5;
$function$;

-- 3.6 search_wines - fonction de recherche principale
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
  created_at timestamp with time zone, 
  updated_at timestamp with time zone, 
  domain jsonb, 
  wine_type jsonb, 
  wine_classification jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $function$
DECLARE
  normalized_query TEXT := extensions.unaccent(lower(query));
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
      wine.normalized_name OPERATOR(extensions.%) normalized_query
   OR domain.normalized_name OPERATOR(extensions.%) normalized_query
   OR wine.year::text ILIKE ('%' || query || '%')
   OR wine_type.normalized_type OPERATOR(extensions.%) normalized_query
   OR wine_classification.normalized_nom OPERATOR(extensions.%) normalized_query
  ORDER BY 
    GREATEST(
      extensions.similarity(wine.normalized_name, normalized_query), 
      extensions.similarity(domain.normalized_name, normalized_query),
      COALESCE(extensions.similarity(wine_type.normalized_type, normalized_query), 0),
      COALESCE(extensions.similarity(wine_classification.normalized_nom, normalized_query), 0)
    ) DESC
  LIMIT 50;
END;
$function$;

-- Étape 4: Créer les index manquants pour les performances
CREATE INDEX IF NOT EXISTS idx_post_comment_post_id ON post_comment(post_id);
CREATE INDEX IF NOT EXISTS idx_user_badge_user_id ON user_badge(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badge_badge_id ON user_badge(badge_id);
CREATE INDEX IF NOT EXISTS idx_event_payment_event_id ON event_payment(event_id);
CREATE INDEX IF NOT EXISTS idx_event_payment_user_id ON event_payment(user_id);
CREATE INDEX IF NOT EXISTS idx_event_payment_status ON event_payment(status);