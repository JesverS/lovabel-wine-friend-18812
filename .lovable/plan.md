
# Correction de la Capture d'Image Blanche

## Probleme Identifie

L'image generee est entierement blanche car `html2canvas` capture un element avec `opacity: 0`. La sequence actuelle est :

```text
1. opacity = '0' (element invisible)
         |
         v
2. html2canvas capture
         |
         v
3. Canvas = transparent/blanc
```

Le callback `onclone` force les couleurs de fond mais ne restaure PAS l'opacite a 1 dans le clone.

## Solution

Forcer `opacity: 1` dans le callback `onclone` pour que l'element clone soit visible lors de la rasterisation, tout en gardant l'element reel invisible pour l'utilisateur.

```text
DOM reel              Clone html2canvas
-----------           -----------------
opacity: 0    --->    opacity: 1 (force dans onclone)
(invisible)           (visible pour capture)
```

## Modifications

### Fichier: `src/components/ShareStoryDialog.tsx`

#### Modification 1 : Ajouter `opacity: 1` dans onclone

Dans la fonction `generateImage()`, modifier le callback `onclone` pour forcer l'opacite a 1 sur l'element clone :

```tsx
onclone: (_clonedDoc, element) => {
  // CRITIQUE: Forcer l'opacite a 1 sur le clone
  element.style.opacity = '1';
  
  // Forcer le fond blanc sur la carte
  const whiteCard = element.querySelector('[data-story-card]');
  if (whiteCard instanceof HTMLElement) {
    whiteCard.style.backgroundColor = '#FFFFFF';
  }
  // ... reste du code
}
```

#### Modification 2 : Ajouter un fond de secours

Changer `backgroundColor: null` en `backgroundColor: selectedColor` pour eviter un canvas transparent :

```tsx
const canvas = await html2canvas(storyRef.current, { 
  scale: 1, 
  useCORS: true, 
  allowTaint: true, 
  backgroundColor: selectedColor, // Fond de secours
  // ...
});
```

Cela necessite de passer `selectedColor` a la fonction `generateImage()`.

## Resume des Changements

| Element | Avant | Apres |
|---------|-------|-------|
| Opacite clone | Non definie (herite 0) | Forcee a 1 dans onclone |
| backgroundColor canvas | null (transparent) | selectedColor (couleur selectionnee) |

## Resultat Attendu

L'image generee affichera correctement :
- Le fond colore (Bordeaux, Or, etc.)
- La carte blanche avec tous les elements
- Les textes et images

Plus d'image blanche.
