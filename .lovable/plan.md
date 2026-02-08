

# Plan : Detection de doublons de vin dans le scanner d'etiquettes (version affinee)

## Resume

Quand un utilisateur scanne une etiquette, le Edge Function `scan-wine-label` fait deja du matching intelligent pour les domaines et appellations. Ce plan ajoute une etape de recherche du vin existant, mais uniquement si le domaine a ete **trouve** (pas cree). La logique est la suivante :

- **Domaine cree** (`domain_created: true`) : aucune recherche de vin, il ne peut pas exister
- **Domaine trouve** (`domain_created: false`) : recherche d'un vin avec :
  - `domain_id` : egalite parfaite (garanti par le matching domaine deja fait)
  - `year` : egalite parfaite (meme 1 an de decalage = pas de match)
  - `name` : similarite a 88% via `pg_trgm` (pour tolerer les variations mineures de nommage)

Si un vin existant est trouve, son ID est retourne au frontend qui l'utilise directement au lieu d'en creer un nouveau.

---

## Cas geres

| Cas | Resultat |
|-----|----------|
| Domaine nouvellement cree | Pas de recherche, creation du vin |
| Domaine trouve + meme annee + nom similaire (>=88%) | Vin existant retourne |
| Domaine trouve + annee differente (meme 1 an) | Pas de match, creation |
| Domaine trouve + nom trop different (<88%) | Pas de match, creation |
| Domaine trouve + annee nulle en scan OU en base | Pas de match, creation |

---

## Fichiers a modifier

| Fichier | Action | Description |
|---------|--------|-------------|
| Migration SQL | CREER | Fonction RPC `search_existing_wine` |
| `supabase/functions/scan-wine-label/index.ts` | MODIFIER | Appeler la RPC apres le matching domaine (seulement si domaine non cree) |
| `src/hooks/useWineLabelScan.ts` | MODIFIER | Ajouter `wine_id` et `wine_matched` au type `WineLabelData` |
| `src/components/WineLabelScanner.tsx` | MODIFIER | Afficher "(deja en base)" quand un vin est matche |
| `src/components/CreateWineForPostDialog.tsx` | MODIFIER | Utiliser le vin existant au lieu d'en creer un nouveau |
| `src/components/AddWineToDomainDialog.tsx` | MODIFIER | Idem |
| `src/components/CreateWineInDomainDialog.tsx` | MODIFIER | Idem |

---

## Section technique

### 1. Fonction RPC : `search_existing_wine`

```sql
CREATE OR REPLACE FUNCTION public.search_existing_wine(
  search_name text,
  p_domain_id uuid,
  p_year integer
)
RETURNS TABLE(id uuid, name text, year integer, label_url text, sim float)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    w.id,
    w.name,
    w.year,
    w.label_url,
    extensions.similarity(
      COALESCE(w.normalized_name, extensions.unaccent(lower(w.name))),
      extensions.unaccent(lower(search_name))
    ) as sim
  FROM wine w
  WHERE w.domain_id = p_domain_id
    AND w.year = p_year
    AND extensions.similarity(
      COALESCE(w.normalized_name, extensions.unaccent(lower(w.name))),
      extensions.unaccent(lower(search_name))
    ) > 0.88
  ORDER BY sim DESC
  LIMIT 1;
$$;
```

Points cles :
- `domain_id` : egalite stricte via `=` (le domaine est deja resolu)
- `year` : egalite stricte via `=` (pas de tolerance)
- `name` : similarite `pg_trgm` avec seuil a 0.88
- `p_year` est de type `integer` (pas nullable) : la recherche ne se fait que si l'annee est connue
- Utilise `normalized_name` existant avec fallback sur `unaccent(lower(name))`

### 2. Modification du Edge Function `scan-wine-label`

Ajouter deux nouveaux champs a l'interface `WineLabelData` :

```text
wine_id: string | null
wine_matched: boolean
```

Initialiser dans `resultData` :
```text
wine_id: null
wine_matched: false
```

Nouvelle etape inseree **apres** le matching domaine et **avant** l'enregistrement du scan (entre ligne 440 et 442 du code actuel) :

Condition d'execution :
- `resultData.domain_id` est present (un domaine a ete trouve ou cree)
- `resultData.domain_created === false` (le domaine existait deja)
- `resultData.year` est present (l'annee a ete extraite par l'IA)
- `finalWineName` est present (un nom de vin a ete identifie)

Si toutes les conditions sont remplies, appel de la RPC :

```text
supabaseAdmin.rpc('search_existing_wine', {
  search_name: finalWineName,
  p_domain_id: resultData.domain_id,
  p_year: resultData.year
})
```

Si un resultat est retourne :
- `resultData.wine_id = result[0].id`
- `resultData.wine_matched = true`
- Log : "Found existing wine: {name} ({year}) - similarity: {sim}"

Si aucun resultat ou erreur :
- Les valeurs restent `null` / `false`
- Log informatif

### 3. Modification du hook `useWineLabelScan.ts`

Ajout des champs au type `WineLabelData` :

```text
wine_id: string | null
wine_matched: boolean
```

Ajout d'un toast specifique dans la fonction `scanImage` quand `data.data.wine_matched === true` :

```text
toast.success('Ce vin existe deja en base de donnees !')
```

### 4. Modification du `WineLabelScanner.tsx`

Dans la section des resultats du scan (lignes 252-273), ajouter apres l'affichage du nom du vin :

- Si `scanResult.wine_matched` est `true` : afficher un badge vert "(deja en base)" a cote du nom du vin

### 5. Modification des dialogues de creation

Pour chaque dialogue (`CreateWineForPostDialog`, `AddWineToDomainDialog`, `CreateWineInDomainDialog`) :

**Nouvel etat** : `matchedWineId` (string | null), initialise a `null`

**Dans `handleScanComplete` / `onScanComplete`** :
- Si `data.wine_matched && data.wine_id` : stocker dans `matchedWineId`

**Dans la fonction de soumission** (`handleCreateWine`) :
- Si `matchedWineId` est present :
  - Ne pas faire d'INSERT dans la table `wine`
  - Ne pas uploader de nouvelle image (le vin existant a deja son label)
  - Recuperer le vin existant avec un SELECT : `supabase.from('wine').select('*, domain:domain_id(...)').eq('id', matchedWineId).single()`
  - Appeler `onWineCreated` avec le vin recupere
  - Afficher "Vin existant utilise"
- Sinon : comportement actuel inchange (creation)

**Bouton de soumission** :
- Si `matchedWineId` : texte "Utiliser ce vin" au lieu de "Creer la bouteille" / "Creer le vin"
- L'utilisateur voit les champs pre-remplis et comprend que le vin existe deja

**Bouton "Changer" du domaine** (dans `CreateWineForPostDialog`) :
- Reset aussi `matchedWineId` a `null`

**Reset du formulaire** :
- Ajouter `setMatchedWineId(null)` dans chaque `resetForm()`

### Note sur `CreateWineForGameDialog`

Ce dialogue n'utilise pas le scanner IA, donc il n'est pas impacte par ces changements. Aucune modification necessaire.

