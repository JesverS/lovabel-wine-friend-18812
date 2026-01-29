

# Modifications du Template Story Instagram

## Objectif

Améliorer le visuel des stories Instagram générées pour :
1. Supprimer les traits décoratifs
2. Afficher le texte du post en dessous de la photo
3. Utiliser les couleurs de l'application pour la cohérence visuelle

---

## Modifications à Apporter

### 1. Suppression des Traits Décoratifs

**Fichier** : `src/components/ShareStoryDialog.tsx`

- Supprimer le composant `DecorativeLines` (lignes 67-80)
- Supprimer l'appel `<DecorativeLines />` dans `StoryTemplateCard` (ligne 123)

### 2. Afficher le Texte en Dessous de la Photo

**Modification du layout** dans `StoryTemplateCard` :

Actuellement le texte (`content`) n'est affiché que si `!wineNotice`. Changer pour :
- Afficher le texte `content` **toujours** après l'image (s'il existe)
- Positionner avant la note et les sliders de dégustation

**Nouveau flux visuel :**
```
┌─────────────────────────┐
│      Nom du Vin         │
│       Domaine           │
├─────────────────────────┤
│                         │
│        [Photo]          │
│                         │
├─────────────────────────┤
│   "Texte du post..."    │  ← NOUVEAU : toujours affiché si présent
├─────────────────────────┤
│         8.5/10          │
│  [Sliders dégustation]  │
└─────────────────────────┘
```

### 3. Nouvelles Couleurs de Fond

Remplacer les couleurs pastel par les couleurs de la charte :

| Ancienne | Nouvelle | Description |
|----------|----------|-------------|
| Taupe #A89F91 | **#6A1B2B** | Bordeaux (Primary) |
| Rose #D4A5A5 | **#8B2438** | Bordeaux Clair (Primary Light) |
| Sauge #A5B5A5 | **#C9A227** | Or (Secondary) |
| Lavande #B5A5C5 | **#1A1A1A** | Noir Élégant (Slate) |

**Code mis à jour :**
```typescript
const STORY_COLORS = [
  { name: 'Bordeaux', value: '#6A1B2B' },
  { name: 'Bordeaux Clair', value: '#8B2438' },
  { name: 'Or', value: '#C9A227' },
  { name: 'Noir', value: '#1A1A1A' },
];
```
Ajout une 5eme couleur un beige claire comme sur le site 
---

## Détails Techniques

### Structure Modifiée de StoryTemplateCard

```tsx
const StoryTemplateCard = ({ ... }) => {
  return (
    <div style={{ backgroundColor }}>
      {/* SUPPRIMÉ : DecorativeLines */}
      
      <div className="white-card">
        {/* Nom et domaine */}
        <h2>{wineName}</h2>
        <p>{domainName}</p>
        
        {/* Séparateur */}
        <div className="separator" />
        
        {/* Image */}
        <div className="image-container">
          <img src={imageUrl} />
        </div>
        
        {/* NOUVEAU : Texte toujours affiché */}
        {content && (
          <p className="quote">"{content}"</p>
        )}
        
        {/* Note et sliders (si wine_notice) */}
        {migratedNotice && (
          <>
            <div className="rating">{rating}/10</div>
            <div className="sliders-grid">...</div>
          </>
        )}
      </div>
      
      {/* Footer @winenote */}
    </div>
  );
};
```

### Ajustements de Couleur du Texte Footer

Pour les couleurs sombres (Bordeaux, Noir), le texte blanc reste lisible.
Pour la couleur Or (#C9A227), le texte devra être noir pour le contraste :

```typescript
const isLightBackground = backgroundColor === '#C9A227';
const footerTextColor = isLightBackground ? '#1A1A1A' : '#FFFFFF';
```

---

## Résumé des Changements

| Élément | Avant | Après |
|---------|-------|-------|
| Traits décoratifs | 3 lignes SVG | Supprimés |
| Position du texte | Seulement si pas de note | Toujours sous la photo |
| Couleurs | Pastel (Taupe, Rose, Sauge, Lavande) | Charte app (Bordeaux, Or, Noir) |
| Footer | Toujours blanc | Adaptatif selon fond |

---

## Fichier à Modifier

`src/components/ShareStoryDialog.tsx`

