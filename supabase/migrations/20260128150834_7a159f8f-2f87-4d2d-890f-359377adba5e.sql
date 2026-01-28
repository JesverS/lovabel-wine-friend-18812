-- Phase 1: Créer la table appellation et les données

-- 1. Créer fonction de normalisation
CREATE OR REPLACE FUNCTION public.appellation_normalize_nom()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  NEW.normalized_nom := extensions.unaccent(lower(NEW.nom));
  RETURN NEW;
END;
$$;

-- 2. Créer table appellation
CREATE TABLE IF NOT EXISTS public.appellation (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(255) NOT NULL UNIQUE,
  region VARCHAR(255),
  pays VARCHAR(100) DEFAULT 'France',
  type_vin_suggere TEXT,
  description TEXT,
  normalized_nom TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Trigger pour normalisation
CREATE TRIGGER trg_appellation_normalize_nom
  BEFORE INSERT OR UPDATE ON appellation
  FOR EACH ROW
  EXECUTE FUNCTION appellation_normalize_nom();

-- 4. Index pour recherche
CREATE INDEX idx_appellation_normalized_nom 
  ON appellation USING gin(normalized_nom extensions.gin_trgm_ops);

-- 5. Ajouter colonne appellation à wine
ALTER TABLE wine ADD COLUMN IF NOT EXISTS appellation_id INTEGER REFERENCES appellation(id);
CREATE INDEX IF NOT EXISTS idx_wine_appellation ON wine(appellation_id);

-- 6. RLS pour appellation
ALTER TABLE appellation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Appellations visibles par tous" 
  ON appellation FOR SELECT USING (true);

CREATE POLICY "Utilisateurs authentifies peuvent creer des appellations"
  ON appellation FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- 7. Insérer les appellations principales
INSERT INTO appellation (nom, region, pays, type_vin_suggere, description) VALUES
  ('Champagne', 'Champagne', 'France', 'effervescent', 'AOC Champagne'),
  ('Crémant d''Alsace', 'Alsace', 'France', 'effervescent', 'AOC Crémant d''Alsace'),
  ('Crémant de Bourgogne', 'Bourgogne', 'France', 'effervescent', 'AOC Crémant de Bourgogne'),
  ('Crémant de Loire', 'Loire', 'France', 'effervescent', 'AOC Crémant de Loire'),
  ('Crémant de Bordeaux', 'Bordeaux', 'France', 'effervescent', 'AOC Crémant de Bordeaux'),
  ('Crémant de Limoux', 'Languedoc', 'France', 'effervescent', 'AOC Crémant de Limoux'),
  ('Crémant du Jura', 'Jura', 'France', 'effervescent', 'AOC Crémant du Jura'),
  ('Prosecco', 'Vénétie', 'Italie', 'effervescent', 'DOC/DOCG Prosecco'),
  ('Cava', 'Catalogne', 'Espagne', 'effervescent', 'DO Cava'),
  ('Franciacorta', 'Lombardie', 'Italie', 'effervescent', 'DOCG Franciacorta'),
  ('Sekt', 'Allemagne', 'Allemagne', 'effervescent', 'Vin mousseux allemand')
ON CONFLICT (nom) DO NOTHING;

-- 8. Migrer les vins champagne -> effervescent + appellation Champagne
UPDATE wine 
SET 
  appellation_id = (SELECT id FROM appellation WHERE nom = 'Champagne'),
  type = 'effervescent'
WHERE type = 'champagne';

-- 9. Migrer les vins crémant -> effervescent + appellation Crémant de Bourgogne
UPDATE wine 
SET 
  appellation_id = (SELECT id FROM appellation WHERE nom = 'Crémant de Bourgogne'),
  type = 'effervescent'
WHERE type = 'crémant';

-- 10. Migrer les vins prosecco
UPDATE wine 
SET 
  appellation_id = (SELECT id FROM appellation WHERE nom = 'Prosecco'),
  type = 'effervescent'
WHERE type = 'prosecco';