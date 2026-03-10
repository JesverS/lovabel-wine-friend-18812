

# Analyse — Uniformisation des bannieres

## Problemes identifies

| Contexte | Ratio de crop | Affichage |
|----------|--------------|-----------|
| **CreateEventDialog** | 16/9 | — |
| **EditEventDialog** | 16/9 | — |
| **CreateCellarDialog** | 16/9 | — |
| **EditCellarDialog** | **21/9** | — |
| **EventDetails** (affichage) | — | `h-48 md:h-64 lg:h-96` (pas de ratio fixe) |
| **EventInvitation** (affichage) | — | `h-48` fixe |
| **CellarDetails** (affichage) | — | `h-64` fixe |

### Problemes concrets

1. **Ratio de crop incohérent** : Les caves utilisent 21/9 en édition mais 16/9 en création. Les events utilisent 16/9 partout. Aucune cohérence globale.
2. **Affichage sans ratio fixe** : Les conteneurs utilisent des hauteurs fixes (`h-48`, `h-64`, `h-96`) qui varient selon les pages et les breakpoints, ce qui déforme ou coupe différemment selon la largeur d'écran.
3. **Aucune indication utilisateur** : Pas de texte indiquant la taille recommandée. L'utilisateur uploade n'importe quoi.
4. **Pas de compression/redimensionnement** : L'image croppée est envoyée telle quelle, potentiellement en 4000x2250px pour une bannière affichée en 800px de large.

---

## Solution proposée

### 1. Standardiser le ratio de crop a 16/9 partout

- **EditCellarDialog** : Changer `aspect={21/9}` en `aspect={16/9}` (1 ligne)
- Toutes les bannieres (events + caves) croppées en 16/9

### 2. Standardiser l'affichage avec un ratio fixe

Remplacer les `h-48 md:h-64 lg:h-96` par un conteneur `aspect-video` (16/9 natif de Tailwind) avec une hauteur max :

```text
Avant :  <div class="w-full h-48 md:h-64 lg:h-96">
Après :  <div class="w-full aspect-video max-h-[400px]">
```

Appliquer ca dans :
- `EventDetails.tsx` (banniere event)
- `CellarDetails.tsx` (banniere cave)
- `EventInvitation.tsx` (banniere invitation)

### 3. Redimensionner l'image avant upload (compression)

Dans `ImageCropDialog.tsx`, apres le crop, redimensionner le canvas a une largeur max de **1920px** (et hauteur proportionnelle). Ca reduit la taille du fichier sans perte visible.

Ajouter aussi une compression JPEG a 0.85 (actuellement 0.9).

### 4. Ajouter une indication de taille recommandee

Dans les dialogs de creation/edition (event + cave), ajouter un texte sous le bouton d'upload :

> Format recommandé : 1920 x 1080 px (16:9)

---

## Fichiers modifies

| Fichier | Changement |
|---------|-----------|
| `src/components/EditCellarDialog.tsx` | Ratio 21/9 → 16/9 |
| `src/components/ImageCropDialog.tsx` | Resize max 1920px + compression 0.85 |
| `src/pages/EventDetails.tsx` | `aspect-video max-h-[400px]` |
| `src/pages/CellarDetails.tsx` | `aspect-video max-h-[400px]` |
| `src/pages/EventInvitation.tsx` | `aspect-video max-h-[200px]` |
| `src/components/CreateEventDialog.tsx` | Texte "Format recommandé" |
| `src/components/EditEventDialog.tsx` | Texte "Format recommandé" |
| `src/components/CreateCellarDialog.tsx` | Texte "Format recommandé" |
| `src/components/EditCellarDialog.tsx` | Texte "Format recommandé" |

Complexite : faible (~1h). Impact visuel : immediat et cohérent sur toute l'app.

