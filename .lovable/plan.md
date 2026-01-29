

# Correction du Débordement des Barres de Dégustation

## Problème Identifié

D'après la capture d'écran, les barres de dégustation (Acidité, Sec, Sucrosité, Gras) débordent en bas du carré blanc arrondi. Le contenu total ne tient pas dans l'espace alloué.

```text
┌─────────────────────────────┐
│  CHABLIS                    │
│  Dominique Gruhier          │
│  ───────                    │
│                             │
│  [    PHOTO DU VIN     ]    │
│                             │
│  "Teste sans photo"         │
│         8.1/10              │
├─────────────────────────────┤ ← Bord du carré blanc
│  Acidité ████      Sec ████ │ ← DÉBORDE!
│  Sucrosité ████    Gras ████│ ← DÉBORDE!
└─────────────────────────────┘
```

## Cause

Le carré blanc a une hauteur fixée par `top: 320px` et `bottom: 280px`, ce qui laisse **1320px** de hauteur. Avec tous les éléments (titre, domaine, séparateur, photo 600px, citation, note 64px, et 4 barres), le contenu dépasse cette limite.

## Solution

1. **Réduire la taille de la photo** quand il y a une notice de dégustation
2. **Réduire l'espacement vertical** entre les éléments
3. **Agrandir légèrement le carré blanc** en réduisant `bottom` de 280px à 220px

---

## Modifications Techniques

### 1. Agrandir le Carré Blanc

```tsx
// Avant
style={{
  top: '320px',
  bottom: '280px',  // Hauteur = 1320px
}}

// Après
style={{
  top: '280px',
  bottom: '200px',  // Hauteur = 1440px (+120px)
}}
```

### 2. Réduire les Espacements

| Élément | Avant | Après |
|---------|-------|-------|
| Header (mb) | `mb-5` | `mb-3` |
| Separator (mb) | `mb-5` | `mb-3` |
| Image container (mb) | `mb-4` | `mb-3` |
| Content quote (mb) | `mb-4` | `mb-2` |
| Rating (mb) | `mb-4` | `mb-2` |
| Tasting grid (gap-y) | `gap-y-4` | `gap-y-3` |

### 3. Réduire la Taille Max de l'Image avec Notice

```tsx
// Avant
style={{ maxHeight: migratedNotice ? '600px' : '750px' }}

// Après
style={{ maxHeight: migratedNotice ? '500px' : '700px' }}
```

### 4. Réduire la Taille de la Note

```tsx
// Avant
style={{ fontSize: '64px' }}

// Après
style={{ fontSize: '56px' }}
```

---

## Résumé

| Modification | Impact |
|--------------|--------|
| Carré blanc agrandi | +120px de hauteur disponible |
| Espacements réduits | ~-50px de hauteur utilisée |
| Image plus petite | -100px quand notice présente |
| Note plus compacte | ~-20px |

Le contenu tiendra maintenant entièrement dans le carré blanc arrondi.

---

## Fichier à Modifier

`src/components/ShareStoryDialog.tsx`

