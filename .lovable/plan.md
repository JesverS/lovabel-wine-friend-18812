

# Marqueurs photo de bouteille sur la carte

## Faisabilité

C'est faisable et pas trop gourmand. Mapbox permet de charger des images dynamiques via `map.addImage()`. L'approche : pour chaque dégustation ayant un `label_url`, on charge l'image, on la dessine dans un canvas (petit carré arrondi avec bordure colorée par type de source), puis on l'utilise comme icône dans le layer `symbol`. Pour les dégustations sans photo, on garde le pin SVG actuel en fallback.

**Performance** : un utilisateur a rarement plus de 50-100 dégustations. Charger 50 petites images (redimensionnées à ~40x40px via canvas) est tout à fait raisonnable. De plus, le clustering regroupe les points zoomés out, donc seuls les points visibles chargent leur image.

## Changements

### 1. Migration SQL : ajouter `label_url` au RPC

Le RPC `get_user_tastings_with_location` ne retourne pas actuellement `label_url`. Il faut l'ajouter au `RETURNS TABLE` et au `SELECT` (via `w.label_url`) dans les 3 branches `UNION ALL`.

### 2. Frontend `TastingsMap.tsx`

- Ajouter `label_url` à l'interface `TastingLocation`
- Pour chaque tasting avec `label_url` : charger l'image dans un canvas de 48x48px, dessiner un carré arrondi avec bordure colorée (bleu/violet/rouge selon source), puis `map.addImage('wine-{id}', canvas)`
- Pour les tastings sans `label_url` : garder le pin SVG coloré actuel
- Le layer `unclustered-point` utilise `icon-image: ["get", "icon"]` qui pointe soit vers `wine-{id}` soit vers `pin-{source_type}`

Résultat visuel : des petites vignettes carrées arrondies de l'étiquette du vin avec une bordure colorée selon le type de source, directement sur la carte.

| Fichier | Changement |
|---------|-----------|
| Migration SQL | Ajouter `label_url text` au RETURNS TABLE du RPC |
| `TastingsMap.tsx` | Charger les label_url comme images canvas arrondies pour les marqueurs |

