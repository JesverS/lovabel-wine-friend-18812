

# Correction du Problème de Capture d'Image

## Problème Identifié

Le `ref` est actuellement attaché à un élément qui a une transformation CSS `scale(0.25)` appliquée pour l'aperçu. Quand `html2canvas` capture cet élément :
- Il voit un élément de 1080x1920px transformé à 25%
- Mais les options `width: 1080, height: 1920` forcent un canvas de cette taille
- Résultat : une grande image blanche avec le contenu minuscule dans un coin

```
┌─────────────────────────────────┐
│ ┌──────┐                        │
│ │Story │  ← Contenu à 25%       │
│ │ mini │                        │
│ └──────┘                        │
│                                 │
│        Grande zone blanche      │
│                                 │
└─────────────────────────────────┘
```

## Solution

Séparer le conteneur de capture du conteneur d'aperçu :

1. Créer un conteneur caché (hors écran) contenant le template à taille réelle (1080x1920)
2. Le `ref` pointe vers ce conteneur caché
3. L'aperçu visible reste avec `scale(0.25)` mais sans le `ref`

---

## Modifications Techniques

### Structure Actuelle (Problématique)

```tsx
<div 
  ref={storyRef}  // ← ref sur l'élément transformé
  style={{ transform: 'scale(0.25)' }}  // ← problème!
>
  <StoryTemplateCard ... />
</div>
```

### Nouvelle Structure (Corrigée)

```tsx
{/* Conteneur caché pour capture - taille réelle, hors écran */}
<div
  ref={storyRef}
  style={{
    position: 'fixed',
    left: '-9999px',
    top: '-9999px',
    width: '1080px',
    height: '1920px',
    pointerEvents: 'none',
    zIndex: -1,
  }}
>
  <StoryTemplateCard ... />
</div>

{/* Aperçu visible - transformé pour affichage */}
<div style={{ transform: 'scale(0.25)' }}>
  <StoryTemplateCard ... />  {/* Même composant, sans ref */}
</div>
```

### Mise à Jour de generateImage

Supprimer les options `width` et `height` qui forcent une taille incorrecte :

```tsx
const generateImage = async (): Promise<Blob | null> => {
  if (!storyRef.current) return null;
  try {
    const canvas = await html2canvas(storyRef.current, { 
      scale: 1, 
      useCORS: true, 
      allowTaint: true, 
      backgroundColor: null,
      // width et height supprimés - html2canvas prendra les dimensions naturelles
      logging: false 
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

---

## Résultat Attendu

| Avant | Après |
|-------|-------|
| Image 1080x1920 avec contenu à 25% | Image 1080x1920 avec contenu plein format |
| Grande zone blanche | Pas de zone blanche |
| Qualité dégradée | Qualité optimale |

---

## Fichier à Modifier

`src/components/ShareStoryDialog.tsx`

