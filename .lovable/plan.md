

# Bug: Carte des dégustations vide avec plusieurs dégustations

## Diagnostic

Le problème se situe dans `TastingsMap.tsx` lignes 192-237. Le flux est :

1. Pour chaque dégustation avec photo (`label_url`), on charge l'image via `createPhotoMarker()` (appel cross-origin)
2. Si le chargement échoue (CORS, timeout, 404), le `catch` log l'erreur mais **le GeoJSON référence toujours `wine-${tasting.id}` comme icône** (ligne 233)
3. Mapbox GL v3 ne trouve pas l'image référencée et **masque le symbole** — voire ne rend rien dans la couche `symbol` si plusieurs icônes sont manquantes

Avec une seule dégustation, le fallback pin fonctionne souvent. Avec plusieurs, les échecs de chargement CORS s'accumulent et la couche entière devient invisible.

## Correction

**Fichier : `TastingsMap.tsx`**

1. Tracker les IDs des images chargées avec succès dans un `Set<string>`
2. Lors de la construction du GeoJSON (ligne 218-237), vérifier si `wine-${tasting.id}` est dans le Set avant de l'utiliser comme icône — sinon utiliser le fallback `pin-${source_type}`
3. Ajouter un timeout sur `createPhotoMarker` (3 secondes) pour éviter les blocages sur les images lentes

Changement minimal, environ 10 lignes modifiées.

