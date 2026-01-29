

# Correction du Fond Blanc Grisé lors de la Capture

## Analyse du Problème

En examinant la capture d'écran fournie, je constate que le fond blanc de la carte apparaît grisé dans l'image finale générée. Ce problème survient malgré l'utilisation de `backgroundColor: '#FFFFFF'` en style inline.

```text
┌─────────────────────────────────┐
│     MOULIS EN MÉDOC             │
│     Chasse Spleen               │
│     ─────────                   │
│                                 │
│   ┌─────────────────────┐       │
│   │    [PHOTO]          │       │ ← Fond gris au lieu de blanc
│   └─────────────────────┘       │
│                                 │
│   "Test avec photo"             │
│         5/10                    │
│   ████  Fruité    ████  Épicé   │
│   ████  Tannique  ████  Boisé   │
└─────────────────────────────────┘
```

## Causes Identifiées

1. **Élément hors viewport** : Le conteneur de capture est positionné à `left: -9999px`. html2canvas peut avoir des difficultés à calculer correctement les styles pour les éléments entièrement hors du viewport.

2. **Héritage CSS résiduel** : Les classes Tailwind comme `space-y-2`, `flex`, `grid` peuvent hériter de styles du thème qui influencent le rendu.

3. **Option `backgroundColor: null`** : Cette option dans html2canvas rend le fond transparent, mais le contenu peut hériter d'autres couleurs.

## Solution

### 1. Utiliser `onclone` pour forcer les styles lors du clonage

La fonction `onclone` de html2canvas permet de modifier le DOM cloné avant le rendu. C'est le moment idéal pour forcer explicitement le fond blanc.

### 2. Ajouter `backgroundColor` au niveau de l'option html2canvas

Spécifier une couleur de fond par défaut pour le canvas entier.

### 3. Positionner temporairement l'élément dans le viewport

Rendre l'élément visible momentanément (mais invisible visuellement via opacity) pour que les styles soient correctement calculés.

---

## Modifications Techniques

### Fichier: `src/components/ShareStoryDialog.tsx`

#### Modification 1 : Options html2canvas améliorées

```tsx
const generateImage = async (): Promise<Blob | null> => {
  if (!storyRef.current) return null;
  try {
    const canvas = await html2canvas(storyRef.current, { 
      scale: 1, 
      useCORS: true, 
      allowTaint: true, 
      backgroundColor: null, // Garder transparent pour le fond coloré principal
      logging: false,
      // Forcer les styles dans le clone avant rendu
      onclone: (clonedDoc, element) => {
        // Trouver la carte blanche dans le clone et forcer son fond
        const whiteCard = element.querySelector('[data-story-card]');
        if (whiteCard instanceof HTMLElement) {
          whiteCard.style.backgroundColor = '#FFFFFF';
        }
        // Forcer aussi les éléments enfants
        element.querySelectorAll('[data-story-element]').forEach((el) => {
          if (el instanceof HTMLElement) {
            // Appliquer les styles de fond explicitement
            const currentBg = el.getAttribute('data-bg');
            if (currentBg) {
              el.style.backgroundColor = currentBg;
            }
          }
        });
      }
    });
    return new Promise((resolve) => { 
      canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0); 
    });
  } catch (error) { 
    console.error('Erreur génération image:', error); 
    return null; 
  }
};
```

#### Modification 2 : Ajouter des attributs data-* pour identification

Modifier le composant `StoryTemplateCard` pour ajouter des marqueurs qui permettront d'identifier les éléments à forcer :

```tsx
{/* White card */}
<div
  data-story-card="true"
  className="absolute rounded-[48px] flex flex-col"
  style={{
    left: '80px',
    right: '80px',
    top: '280px',
    bottom: '200px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
    padding: '36px',
    backgroundColor: '#FFFFFF',
  }}
>
```

```tsx
{/* Separator avec data-bg */}
<div 
  data-story-element="true" 
  data-bg="#E5E7EB"
  className="w-24 h-0.5 mx-auto mb-3" 
  style={{ backgroundColor: '#E5E7EB' }} 
/>
```

#### Modification 3 : Positionner dans le viewport pendant le rendu

Changer la stratégie : au lieu de positionner hors écran, utiliser `opacity: 0` avec `position: fixed` dans le viewport visible, puis restaurer après capture :

```tsx
const generateImage = async (): Promise<Blob | null> => {
  if (!storyRef.current) return null;
  try {
    // Temporairement rendre visible pour le calcul des styles
    const originalStyles = {
      left: storyRef.current.style.left,
      top: storyRef.current.style.top,
      opacity: storyRef.current.style.opacity,
    };
    
    // Placer dans le viewport mais invisible
    storyRef.current.style.left = '0px';
    storyRef.current.style.top = '0px';
    storyRef.current.style.opacity = '0';
    
    // Forcer le recalcul des styles
    await new Promise(resolve => requestAnimationFrame(resolve));
    
    const canvas = await html2canvas(storyRef.current, { 
      scale: 1, 
      useCORS: true, 
      allowTaint: true, 
      backgroundColor: null,
      logging: false,
    });
    
    // Restaurer les styles originaux
    storyRef.current.style.left = originalStyles.left;
    storyRef.current.style.top = originalStyles.top;
    storyRef.current.style.opacity = originalStyles.opacity || '1';
    
    return new Promise((resolve) => { 
      canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0); 
    });
  } catch (error) { 
    console.error('Erreur génération image:', error); 
    return null; 
  }
};
```

---

## Solution Recommandée (Combinée)

La solution la plus robuste combine les approches 1 et 3 :

1. **Utiliser `onclone`** pour forcer explicitement `#FFFFFF` sur la carte blanche
2. **Positionner temporairement** l'élément dans le viewport avec `opacity: 0` avant la capture
3. **Ajouter un marqueur `data-story-card`** pour identifier facilement l'élément à modifier

---

## Résumé des Modifications

| Élément | Action |
|---------|--------|
| `generateImage()` | Ajouter positionnement temporaire viewport + callback `onclone` |
| Carte blanche | Ajouter attribut `data-story-card="true"` |
| `onclone` | Forcer `backgroundColor: '#FFFFFF'` sur l'élément cloné |

---

## Fichier à Modifier

`src/components/ShareStoryDialog.tsx`

