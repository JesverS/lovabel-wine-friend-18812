

# Plan : Gestion des marqueurs co-localisés + qualité d'image + lien vers page vin

## Probleme

Quand deux degustations partagent les memes coordonnees (meme evenement, meme cave), les marqueurs se superposent exactement et un seul est cliquable. De plus, le popup actuel n'offre pas de lien vers la page du vin, et la qualite des marqueurs photo pourrait etre amelioree.

## Solution

### 1. Grouper les degustations co-localisees

Avant de construire le GeoJSON, grouper les tastings par coordonnees identiques (cle `lat,lng`). Pour chaque groupe :
- **1 seul tasting** : comportement actuel (marqueur simple)
- **2+ tastings** : creer un marqueur composite (pastille avec badge compteur) qui, au clic, affiche un popup listant tous les vins du groupe

### 2. Marqueur composite pour les groupes

Creer une fonction `createGroupMarker(images[], colors[], count)` qui dessine sur canvas :
- Les 2 premieres photos de bouteille qui se chevauchent legerement (decalage de 12px)
- Un petit badge rond en bas a droite avec le nombre total (ex: "3")
- Bordure coloree selon le source_type dominant

### 3. Popup multi-vins

Quand on clique sur un marqueur groupe, le popup HTML affiche une liste scrollable de tous les vins :
```
┌─────────────────────────────┐
│  Vin A 2019                 │
│  Domaine X · Evenement Y    │
│  12/01/2025                 │
│  [Voir le vin] [📸 Story]  │
├─────────────────────────────┤
│  Vin B 2020                 │
│  Domaine Z · Cave W         │
│  12/01/2025                 │
│  [Voir le vin] [📸 Story]  │
└─────────────────────────────┘
```

### 4. Lien "Voir le vin" sur tous les popups

Ajouter `wine_id` dans les properties GeoJSON. Dans le popup (simple et multi), ajouter un lien `<a href="/wine/${wine_id}">Voir le vin →</a>` style comme un bouton discret.

### 5. Amelioration qualite des images

- Augmenter la taille du canvas de `48` a `64` pixels (et le `scale` reste a 2, donc 128px effectifs)
- Augmenter la bordure de 3 a 4px pour plus de nettete visuelle
- Augmenter `icon-size` max de 1.0 a 1.1 au zoom 12+

## Fichier modifie

**`src/components/TastingsMap.tsx`** uniquement :
- Fonction utilitaire `groupByLocation(tastings)` → `Map<string, TastingLocation[]>`
- Fonction `createGroupMarker(images, color, count)` pour le canvas composite
- Construction du GeoJSON adaptee (1 feature par groupe au lieu de 1 par tasting)
- Handler de clic adapte : si le feature a `is_group=true`, afficher le popup multi-vins
- Tous les popups incluent le lien `/wine/${wine_id}`
- Taille canvas passee de 48 a 64

