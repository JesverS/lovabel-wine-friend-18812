-- 1. Ajouter le type effervescent
INSERT INTO wine_type (id, type, normalized_type)
VALUES (8, 'effervescent', 'effervescent')
ON CONFLICT (id) DO NOTHING;

-- 2. Migrer les vins champagne vers effervescent (sans appellation)
UPDATE wine 
SET type = 8, appellation_id = NULL
WHERE type = 3;

-- 3. Migrer les vins crémant vers effervescent (sans appellation)
UPDATE wine 
SET type = 8, appellation_id = NULL
WHERE type = 4;

-- 4. Migrer les vins prosecco (s'il y en a)
UPDATE wine 
SET type = 8, appellation_id = NULL
WHERE type = 6;

-- 5. Supprimer les anciens types obsolètes
DELETE FROM wine_type WHERE id IN (3, 4, 6);