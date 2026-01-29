

# Optimisation du Carré Blanc et Troncature Dynamique des Textes

## Objectif

Resserrer les éléments du carré blanc pour réduire sa taille et ajouter une troncature dynamique pour les textes longs (nom du vin, domaine, contenu du post).

---

## Modifications à Apporter

### 1. Réduction des Espacements du Carré Blanc

**État actuel :**
- Padding : `60px`
- Position : `top: 200px`, `bottom: 160px`
- Marges internes : `mb-8`, `mb-6`

**Nouvelles valeurs :**
- Padding : `48px`
- Position : `top: 240px`, `bottom: 200px`
- Marges internes réduites : `mb-6` → `mb-4`, `mb-8` → `mb-5`

### 2. Troncature Dynamique des Textes

| Élément | Limite | Style CSS |
|---------|--------|-----------|
| Nom du vin | 2 lignes max | `line-clamp-2` + `overflow: hidden` |
| Nom du domaine | 1 ligne max | `truncate` (ellipsis) |
| Contenu/citation | 3 lignes max | `line-clamp-3` + `overflow: hidden` |

**Technique utilisée :**
- CSS `display: -webkit-box` avec `-webkit-line-clamp`
- Fallback avec `overflow: hidden` et `text-overflow: ellipsis`

---

## Détails Techniques

### Styles de Troncature à Ajouter

```tsx
// Nom du vin - 2 lignes max
<h2 
  className="text-gray-900 font-serif uppercase tracking-wide leading-tight"
  style={{ 
    fontSize: '48px', 
    fontWeight: 600,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }}
>
  {wineName}
</h2>

// Domaine - 1 ligne avec ellipsis
<p 
  className="text-gray-500 mt-2 truncate"
  style={{ 
    fontSize: '26px',
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }}
>
  {domainName}
</p>

// Citation/contenu - 3 lignes max
<p 
  style={{ 
    fontSize: '24px',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  }}
>
  "{content}"
</p>
```

### Valeurs de Positionnement Révisées

```tsx
<div
  className="absolute bg-white rounded-[48px] flex flex-col"
  style={{
    left: '80px',
    right: '80px',
    top: '240px',      // Avant: 200px
    bottom: '200px',   // Avant: 160px  
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
    padding: '48px',   // Avant: 60px
  }}
>
```

### Réduction des Espacements Internes

| Élément | Avant | Après |
|---------|-------|-------|
| Header (mb) | `mb-8` | `mb-5` |
| Separator (mb) | `mb-8` | `mb-5` |
| Image container (mb) | `mb-6` | `mb-4` |
| Content quote (mb) | `mb-6` | `mb-4` |
| Rating (mb) | `mb-6` | `mb-4` |
| Tasting grid (mt) | `mt-4` | `mt-3` |

---

## Résumé des Changements

| Élément | Modification |
|---------|--------------|
| Carré blanc | Plus compact (-12px padding, +40px top, +40px bottom) |
| Nom du vin | Max 2 lignes + "..." + taille réduite à 48px |
| Domaine | Max 1 ligne + "..." + taille réduite à 26px |
| Citation | Max 3 lignes + "..." + taille réduite à 24px |
| Note | Taille réduite à 64px |
| Espacements | Tous réduits d'environ 20-30% |

---

## Fichier à Modifier

`src/components/ShareStoryDialog.tsx`

