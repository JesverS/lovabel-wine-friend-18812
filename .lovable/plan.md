
# Correction de l'affichage des sliders dynamiques dans les Posts

## Probleme Identifie

Le composant `WineTastingNotes` necessite maintenant un `wineTypeId` pour afficher les bons labels de sliders selon le type de vin. Cependant, dans **3 endroits**, le type de vin n'est pas passe :

| Fichier | Ligne | Probleme |
|---------|-------|----------|
| `PostCard.tsx` | 638 | `<WineTastingNotes wineNotice={post.wine_notice} />` - pas de wineTypeId |
| `PostDetails.tsx` | 269 | `<WineTastingNotes wineNotice={post.wine_notice} />` - pas de wineTypeId |
| `SharedPost.tsx` | 200 | `<WineTastingNotes wineNotice={post.wine_notice} />` - pas de wineTypeId |

De plus, les donnees du vin ne contiennent pas le champ `type` necessaire :
- `useSocialFeed.ts` ligne 186 : la requete sur `wine` ne recupere pas le `type`
- `PostDetails.tsx` ligne 110 : la requete sur `wine` ne recupere pas le `type`
- `SharedPost.tsx` ligne 76 : la requete sur `wine` ne recupere pas le `type`
- `PostCard.tsx` ligne 135 : la requete sur `wine` ne recupere pas le `type`

## Solution

### Etape 1 : Ajouter `type` dans l'interface wine de `useSocialFeed.ts`

Modifier l'interface `PostWithRelations` pour inclure le type de vin :

```typescript
wine: {
  id: string;
  name: string;
  label_url: string | null;
  type: number | null;  // NOUVEAU
  domain: {
    id: string;
    name: string;
  } | null;
} | null;
```

### Etape 2 : Ajouter `type` dans la requete wine de `useSocialFeed.ts`

Modifier la ligne 186 :

```typescript
.select('id, name, label_url, type, domain:domain!wine_domain_id_fkey(id, name)')
```

### Etape 3 : Modifier `PostCard.tsx`

Passer le `wineTypeId` au composant :

```typescript
{post.is_wine_notice && post.wine_notice && (
  <WineTastingNotes 
    wineNotice={post.wine_notice} 
    wineTypeId={wine?.type ?? null}
  />
)}
```

### Etape 4 : Modifier `PostDetails.tsx`

1. Ajouter `type` dans l'interface `PostData` :
```typescript
wine: {
  id: string;
  name: string;
  label_url: string | null;
  type: number | null;  // NOUVEAU
  domain: { name: string } | null;
} | null;
```

2. Modifier la requete (ligne 110) :
```typescript
.select('id, name, label_url, type, domain:domain_id(name)')
```

3. Passer le `wineTypeId` au composant :
```typescript
<WineTastingNotes 
  wineNotice={post.wine_notice} 
  wineTypeId={post.wine?.type ?? null}
/>
```

### Etape 5 : Modifier `SharedPost.tsx`

1. Ajouter `type` dans l'interface `SharedPostData` :
```typescript
wine: {
  id: string;
  name: string;
  label_url: string | null;
  type: number | null;  // NOUVEAU
  domain: { name: string } | null;
} | null;
```

2. Modifier la requete (ligne 76) :
```typescript
.select('id, name, label_url, type, domain:domain_id(name)')
```

3. Passer le `wineTypeId` au composant :
```typescript
<WineTastingNotes 
  wineNotice={post.wine_notice} 
  wineTypeId={post.wine?.type ?? null}
/>
```

### Etape 6 : Modifier la requete dans `PostCard.tsx` (fallback)

Pour le cas ou les donnees ne sont pas pre-chargees, modifier la ligne 135 :

```typescript
.select('*, domain!wine_domain_id_fkey(*), type')
```

Note: le `*` inclut deja tous les champs dont `type`, mais on s'assure que c'est explicite.

## Resume des Fichiers a Modifier

| Fichier | Modifications |
|---------|---------------|
| `src/hooks/useSocialFeed.ts` | Ajouter `type` dans interface + requete wine |
| `src/components/PostCard.tsx` | Passer `wineTypeId={wine?.type}` a WineTastingNotes |
| `src/pages/PostDetails.tsx` | Ajouter `type` dans interface + requete + passer wineTypeId |
| `src/pages/SharedPost.tsx` | Ajouter `type` dans interface + requete + passer wineTypeId |

## Resultat Attendu

Apres ces modifications, les notes de degustation affichees dans les posts utiliseront les bons labels selon le type de vin :
- Vin rouge : Fruite, Epice, Tannique, Boise
- Vin blanc : Acidite, Sec, Sucrosite, Gras
- Rose : Acidite, Fruite, Sec, Frais
- Effervescent : Acidite, Sec, Sucrosite, Effervescence
