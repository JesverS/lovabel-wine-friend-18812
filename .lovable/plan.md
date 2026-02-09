
# Plan : Verification finale anti-doublon a la soumission + Audit complet

## Audit complet des chemins de creation de vin

### Tous les points d'entree pour creer un vin dans la table `wine`

| Composant | Chemin | Scanner IA | Verification doublon existante | Utilisateurs concernes |
|-----------|--------|------------|-------------------------------|----------------------|
| `CreateWineForPostDialog` | Post social -> creer bouteille | Oui (si premium) | Oui (via scan) | Premium + non-premium |
| `AddWineToDomainDialog` | Page domaine -> ajouter vin | Oui (si premium) | Oui (via scan) | Premium + non-premium |
| `CreateWineInDomainDialog` | Event -> domaine -> creer vin | Oui (si premium) | Oui (via scan) | Premium + non-premium |
| `AddWineDialog` | Cave -> ajouter vin -> "introuvable" | Non | Non | Tous |

### Constat

1. **Utilisateurs premium** : le scan IA detecte les doublons, mais si l'utilisateur refuse le match (faux positif) et soumet sans modifier le nom, un doublon est cree.
2. **Utilisateurs non-premium** : aucune verification de doublon. Ils remplissent manuellement et un doublon peut etre cree si le vin existe deja.
3. **`AddWineDialog`** (cave) : chemin entierement manuel, aucune verification, meme pas pour les premium. C'est le trou le plus important.
4. **Pas de contrainte unique en base** : la table `wine` n'a aucun index unique sur `(name, domain_id, year)`. Un seul doublon exact existe actuellement (nom "A108 Blanc" sans annee).

### Cas problematiques identifies

| Scenario | Risque |
|----------|--------|
| Premium scanne, refuse le match (faux positif), soumet tel quel | Doublon cree |
| Non-premium cree manuellement un vin qui existe deja | Doublon cree |
| Deux utilisateurs creent le meme vin simultanement | Doublon cree |
| `AddWineDialog` (cave) : creation manuelle sans aucune verif | Doublon cree |

## Solution proposee

### Verification cote serveur a l'INSERT (approche "filet de securite")

Plutot que de bloquer l'utilisateur avec un message d'erreur, on adopte l'approche demandee : **si un doublon est detecte au moment de la soumission, on utilise silencieusement le vin existant** et on redirige l'utilisateur comme si la creation avait reussi.

### Implementation

#### 1. Nouvelle fonction RPC : `find_or_create_wine`

Cette fonction centralise la creation de vin. Elle :
- Cherche d'abord un vin existant avec les memes criteres (domain_id exact + year exact + name similarite 0.88)
- Si trouve : retourne le vin existant
- Si pas trouve : cree le nouveau vin et le retourne

```sql
CREATE OR REPLACE FUNCTION public.find_or_create_wine(
  p_name text,
  p_domain_id uuid,
  p_year integer DEFAULT NULL,
  p_volume_ml integer DEFAULT NULL,
  p_price real DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_label_url text DEFAULT NULL,
  p_alcohol_percentage numeric DEFAULT NULL,
  p_type bigint DEFAULT NULL,
  p_appellation_id integer DEFAULT NULL,
  p_stock integer DEFAULT 0
)
RETURNS TABLE(
  wine_id uuid,
  wine_name text,
  wine_year integer,
  wine_label_url text,
  was_created boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_existing record;
  v_new record;
BEGIN
  -- Chercher un vin existant si domain_id et year sont fournis
  IF p_domain_id IS NOT NULL AND p_year IS NOT NULL THEN
    SELECT w.id, w.name, w.year, w.label_url
    INTO v_existing
    FROM wine w
    WHERE w.domain_id = p_domain_id
      AND w.year = p_year
      AND extensions.similarity(
        COALESCE(w.normalized_name, extensions.unaccent(lower(w.name))),
        extensions.unaccent(lower(p_name))
      ) > 0.88
    ORDER BY extensions.similarity(
      COALESCE(w.normalized_name, extensions.unaccent(lower(w.name))),
      extensions.unaccent(lower(p_name))
    ) DESC
    LIMIT 1;

    IF v_existing IS NOT NULL THEN
      RETURN QUERY SELECT v_existing.id, v_existing.name, v_existing.year, v_existing.label_url, false;
      RETURN;
    END IF;
  END IF;

  -- Pas de doublon trouve, creer le vin
  INSERT INTO wine (name, domain_id, year, volume_ml, price, description, label_url, alcohol_percentage, type, appellation_id, stock)
  VALUES (p_name, p_domain_id, p_year, p_volume_ml, p_price, p_description, 
          COALESCE(p_label_url, 'https://amzutunyjouejovlrlah.supabase.co/storage/v1/object/public/domain/tmp/default.png'),
          p_alcohol_percentage, p_type, p_appellation_id, p_stock)
  RETURNING id, name, year, label_url INTO v_new;

  RETURN QUERY SELECT v_new.id, v_new.name, v_new.year, v_new.label_url, true;
END;
$$;
```

Note : la colonne `stock` n'existe que dans `AddWineToDomainDialog`. Si elle n'existe pas sur la table `wine`, on l'omettra. (A verifier -- d'apres le schema, il n'y a pas de colonne `stock` sur `wine`, donc on ne l'inclura pas.)

Version corrigee sans `stock` :

```sql
CREATE OR REPLACE FUNCTION public.find_or_create_wine(
  p_name text,
  p_domain_id uuid,
  p_year integer DEFAULT NULL,
  p_volume_ml integer DEFAULT NULL,
  p_price real DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_label_url text DEFAULT NULL,
  p_alcohol_percentage numeric DEFAULT NULL,
  p_type bigint DEFAULT NULL,
  p_appellation_id integer DEFAULT NULL
)
RETURNS TABLE(
  wine_id uuid,
  wine_name text,
  wine_year integer,
  wine_label_url text,
  was_created boolean
)
```

#### 2. Modification des 4 composants de creation

Remplacer chaque `supabase.from('wine').insert(...)` par un appel a `supabase.rpc('find_or_create_wine', {...})`.

**Comportement :**
- Si `was_created = true` : comportement normal actuel (vin cree)
- Si `was_created = false` : le vin existant est utilise. L'image uploadee est inutile mais ce n'est pas grave (elle sera orpheline dans le storage). On affiche un toast "Vin existant utilise" au lieu de "Vin cree".

**Fichiers concernes :**

| Fichier | Modification |
|---------|-------------|
| `src/components/CreateWineForPostDialog.tsx` | Remplacer l'INSERT par `find_or_create_wine`, adapter le retour |
| `src/components/AddWineToDomainDialog.tsx` | Idem |
| `src/components/CreateWineInDomainDialog.tsx` | Idem |
| `src/components/AddWineDialog.tsx` | Idem (le chemin "Mon vin est introuvable" -> creation) |

#### 3. Detail par composant

**CreateWineForPostDialog (ligne ~216)** :
- Remplacer le `.from('wine').insert({...}).select(...).single()` par `.rpc('find_or_create_wine', {...})`
- Le RPC retourne `wine_id, wine_name, wine_year, wine_label_url, was_created`
- Ensuite, faire un `.from('wine').select('*, domain:domain_id(...)').eq('id', result.wine_id).single()` pour obtenir l'objet complet avec le domaine (necessaire pour `onWineCreated`)
- Si `was_created` est false, afficher "Vin existant utilise" au lieu de "Vin cree avec succes"

**AddWineToDomainDialog (ligne ~97)** :
- Meme logique. Le composant n'a pas besoin de retourner l'objet wine complet, juste un callback `onWineCreated()` sans argument
- Remplacer l'INSERT par le RPC

**CreateWineInDomainDialog (ligne ~124)** :
- Meme logique. Apres le RPC, utiliser `result.wine_id` pour l'insertion dans `event_domain_wine`

**AddWineDialog (ligne ~326)** :
- Meme logique. Apres le RPC, utiliser `result.wine_id` pour l'insertion dans `cellar_wine`
- Si `was_created` est false, l'image a ete uploadee dans le domain bucket inutilement -- acceptable

#### 4. Impact sur les utilisateurs non-premium

Cette solution couvre AUSSI les utilisateurs non-premium car la verification se fait au niveau de la RPC, pas du scanner IA. Meme sans scan, au moment de soumettre le formulaire manuel, `find_or_create_wine` verifiera s'il existe un vin similaire.

#### 5. Cas particulier : vin sans annee

Si l'utilisateur ne renseigne pas d'annee (`p_year = NULL`), la RPC ne fait PAS de recherche de doublon et cree directement le vin. C'est voulu : sans annee, on ne peut pas affirmer qu'il s'agit du meme vin (un domaine peut produire le meme vin chaque annee).

#### 6. Cas des images orphelines

Quand un doublon est detecte a la soumission, l'image a deja ete uploadee dans le storage. Elle restera orpheline. C'est un compromis acceptable : la verification se fait apres l'upload pour simplifier le flux. Un nettoyage periodique du storage pourrait etre envisage a terme, mais ce n'est pas prioritaire.

## Resume des fichiers a modifier

| Fichier | Action |
|---------|--------|
| Migration SQL | Creer la fonction RPC `find_or_create_wine` |
| `src/components/CreateWineForPostDialog.tsx` | Utiliser `find_or_create_wine` au lieu de `.insert()` |
| `src/components/AddWineToDomainDialog.tsx` | Idem |
| `src/components/CreateWineInDomainDialog.tsx` | Idem |
| `src/components/AddWineDialog.tsx` | Idem |

## Resume de la couverture

| Scenario | Avant | Apres |
|----------|-------|-------|
| Scan IA detecte un doublon | Couvert (badge + utilisation) | Couvert |
| Scan IA faux positif refuse, soumission sans modif | Doublon cree | Couvert (RPC detecte) |
| Creation manuelle par non-premium | Doublon cree | Couvert (RPC detecte) |
| `AddWineDialog` (cave, creation manuelle) | Doublon cree | Couvert (RPC detecte) |
| Vin sans annee | N/A | Pas de verif (voulu) |
| Vin sans domaine | N/A | Pas de verif (voulu) |
| Creations simultanees | Doublon cree | Quasi-couvert (fenetre de course minimale) |
