-- Ajouter les nouvelles valeurs à l'ENUM domain_region
ALTER TYPE domain_region ADD VALUE IF NOT EXISTS 'unknown';
ALTER TYPE domain_region ADD VALUE IF NOT EXISTS 'other';

-- Ajouter la colonne custom_region pour stocker le nom personnalisé
ALTER TABLE domain ADD COLUMN IF NOT EXISTS custom_region TEXT;

-- Ajouter un commentaire pour documenter l'usage
COMMENT ON COLUMN domain.custom_region IS 'Stores custom region name when region is set to "other"';