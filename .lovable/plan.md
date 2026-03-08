

# Redesign des cartes de degustation + ameliorations carte

## 1. Nouveau layout des cartes de degustation (toutes les vues)

Le layout actuel a une barre d'actions en haut (chapeau) puis le contenu en dessous. Le nouveau layout supprime ce chapeau et integre les actions au meme niveau que le titre.

```text
┌──────────────────────────────────────────┐
│ [img] Nom du vin          [🗑️] [📸] │  ← titre + actions top-right
│       Domaine                            │
│       Année: 2020                        │
│       Commentaire...          ⭐ 4.2/5   │  ← note centree verticalement a droite
│       📅 Dégusté le 08/03/2026           │
└──────────────────────────────────────────┘
```

**Changements concrets dans `UserTastings.tsx`** :

- **Supprimer la barre d'actions du haut** (lignes 1031-1062) : plus de div separee
- **Supprimer `getLikedIcon` / emoji pouce** partout (lignes 736, 829, 922, 1079) : on vire completement l'affichage du liked emoji
- **Nouveau layout** : structure en `flex` avec image a gauche, infos au centre, et a droite un bloc vertical contenant :
  - En haut : boutons Delete + Story (icones seules, ghost, petits) — seulement si `isOwnProfile`
  - Au centre vertical : la note etoile (si elle existe)
- Appliquer ce layout aux 4 vues de detail : `date` (lignes 1024-1093), `event detail` (lignes 714-756), `cellar detail` (lignes 807-850), `domain detail` (lignes 900-950)

## 2. Story Instagram sur la carte (Map)

Actuellement, la popup Mapbox sur un point affiche seulement du texte HTML statique. Il n'y a aucun moyen de lancer le partage Story depuis la carte.

**Solution** : Ne pas tenter d'injecter du React dans une popup Mapbox (c'est du HTML brut). A la place :
- Ajouter un bouton HTML "Partager en Story" dans le `popupContent` du `TastingsMap.tsx`
- Attacher un event listener global sur `map.on('click')` qui detecte les clics sur ce bouton (via `data-tasting-id`)
- Remonter l'info au parent via un callback `onShareStory(tastingId)` dans les props de `TastingsMap`
- Dans `UserTastings.tsx`, recevoir ce callback et ouvrir le `ShareStoryDialog` avec les donnees de la tasting correspondante

## 3. Marqueurs plus jolis sur la carte

Mapbox supporte les marqueurs custom via des images. On peut remplacer les cercles par des marqueurs en forme de goutte/pin avec la couleur par source, et un petit icone vin a l'interieur.

**Approche** : utiliser `map.addImage()` pour charger un SVG custom (pin shape) colore par type de source, puis remplacer le layer `unclustered-point` (type circle) par un layer `symbol` avec `icon-image`. C'est plus elegant que des cercles plats. On gardera 3 couleurs (bleu event, violet cave, rouge spontanee) mais avec une forme de pin/goutte.

Alternative plus simple et immediate : augmenter la taille des cercles, ajouter une ombre portee via un deuxieme layer circle en dessous, et ajouter un petit emoji vin comme symbol layer par-dessus. Cela donne un rendu plus "riche" sans complexite SVG.

## Resume des fichiers modifies

| Fichier | Changement |
|---------|-----------|
| `UserTastings.tsx` | Nouveau layout cartes (4 vues), suppression emoji liked, actions en haut a droite au niveau du titre, note centree a droite, callback `onShareStory` pour la map |
| `TastingsMap.tsx` | Ajout bouton Story dans popup, callback `onShareStory`, marqueurs custom (pins colores + icone vin) |

