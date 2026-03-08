

# Marqueurs photo : cercle plus petit + taille dynamique au zoom

## Changements dans `TastingsMap.tsx`

### 1. Forme circulaire au lieu de carrée
Modifier `createPhotoMarker` : remplacer `roundRect` par `arc` (cercle complet). La bordure colorée devient un anneau circulaire autour de la photo.

### 2. Taille réduite par défaut
Réduire la taille du canvas de 48px à 36px. C'est la taille "max" visible au zoom rapproché.

### 3. Taille dynamique selon le zoom
Dans le layer `unclustered-point`, remplacer `"icon-size": 1` par une interpolation Mapbox basée sur le zoom :

```js
"icon-size": [
  "interpolate", ["linear"], ["zoom"],
  4, 0.4,   // à l'échelle France → 40% de la taille
  8, 0.65,  // zoom intermédiaire
  12, 1.0   // zoom rapproché → taille max (36px)
]
```

Cela donne des marqueurs discrets à l'échelle nationale qui grandissent progressivement en zoomant.

### Fichier modifié
| Fichier | Changement |
|---------|-----------|
| `TastingsMap.tsx` | `createPhotoMarker` → cercle 36px, `icon-size` → interpolation zoom |

