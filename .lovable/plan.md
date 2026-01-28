
# Plan de Correction Post-Migration : Bugs et Scalabilite

## Requete SQL pour Corriger les Appellations Champagne

Execute cette requete manuellement dans le SQL Editor de Supabase :

```sql
-- Corriger l'appellation Champagne pour les vins effervescents dont le domaine est en Champagne
UPDATE wine w
SET appellation_id = (SELECT id FROM appellation WHERE nom = 'Champagne')
WHERE w.type = 8  -- effervescent
  AND w.appellation_id IS NULL
  AND EXISTS (
    SELECT 1 FROM domain d 
    WHERE d.id = w.domain_id 
    AND d.region = 'champagne'
  );
```

---

## Problemes Identifies et Corrections Necessaires

### 1. BUG CRITIQUE : Fonctions RPC avec Jointure Incorrecte

**Probleme** : Les fonctions `search_wines` et `search_wines_game` font une jointure incorrecte :
```sql
LEFT JOIN wine_type wt ON w.type = wt.type::text
```
Or `wine.type` est un `bigint` (ID) et devrait etre joint sur `wt.id`.

**Correction** : Migration SQL pour corriger les deux fonctions RPC :
```sql
-- Corriger search_wines
CREATE OR REPLACE FUNCTION search_wines(query TEXT)
RETURNS TABLE(...) AS $$
  ...
  LEFT JOIN wine_type wt ON w.type = wt.id  -- Correction ici
  ...
$$;

-- Corriger search_wines_game
CREATE OR REPLACE FUNCTION search_wines_game(query TEXT)
RETURNS TABLE(...) AS $$
  ...
  LEFT JOIN wine_type wt ON w.type = wt.id  -- Correction ici
  ...
$$;
```

**Impact** : La recherche de vins ne retournait pas le bon type de vin dans les resultats.

---

### 2. Edge Function fetch-game-questions

**Probleme** : Le mapping `wineTypeMap` dans `fetch-game-questions` ne contient pas le type 8 (effervescent) :

```typescript
const wineTypeMap: { [key: number]: string } = {
  1: 'red',
  2: 'white',
  3: 'eff',     // OBSOLETE - champagne
  4: 'eff',     // OBSOLETE - cremant
  5: 'rose',
  6: 'eff',     // OBSOLETE - prosecco
  7: 'all',
  // MANQUE: 8: 'eff' pour effervescent!
};
```

**Correction** :
```typescript
const wineTypeMap: { [key: number]: string } = {
  1: 'red',     // rouge
  2: 'white',   // blanc
  5: 'rose',    // rose
  7: 'all',     // autre
  8: 'eff',     // effervescent (NOUVEAU)
};
```

**Impact** : Les vins effervescents n'etaient pas correctement filtres dans le jeu.

---

### 3. Jointures Supabase avec wine_type

**Probleme** : Plusieurs composants utilisent la syntaxe `wine_type:type(id, type)` qui fait un join sur le champ `type` au lieu de `id`.

**Fichiers concernes** :
- `src/components/AddWineToEventDialog.tsx` (ligne 56)
- `src/components/wine/WineAutocomplete.tsx` (lignes 56, 88)
- `src/pages/EventDetails.tsx` (lignes 339, 464)

**Correction** : Changer la syntaxe de jointure pour utiliser l'ID :
```typescript
// Avant (incorrect)
wine_type:type(id, type)

// Apres (correct) - Option 1 : Jointure explicite
wine_type!fk_wine_type(id, type)

// Apres (correct) - Option 2 : Query separee
// Recuperer wine_type via w.type directement et mapper cote client
```

**Note** : La syntaxe PostgREST `wine_type:type` cherche une FK nommee `type` qui pointe vers `wine_type`. Si la FK n'existe pas, il faut soit la creer, soit utiliser une approche differente.

---

### 4. Verification des Formulaires de Creation

**Statut** : Les formulaires suivants ont ete mis a jour correctement et envoient des IDs numeriques :

| Fichier | Type Envoye | Statut |
|---------|-------------|--------|
| `AddWineDialog.tsx` | `number` (wineType) | OK |
| `AddWineToDomainDialog.tsx` | `number` (wineType) | OK |
| `CreateWineInDomainDialog.tsx` | `number` | OK |
| `CreateWineForPostDialog.tsx` | `number` | OK |
| `CreateWineForGameDialog.tsx` | `number` | OK |

---

## Scalabilite : Gestion des Types et Appellations Manquants

### Situation Actuelle

**Types de Vin** :
- Table `wine_type` contient : rouge (1), blanc (2), rose (5), autre (7), effervescent (8)
- Le composant `WineTypeSelect` charge dynamiquement depuis la table
- **Pas de mecanisme utilisateur pour creer un nouveau type**

**Appellations** :
- Table `appellation` contient 11 appellations initiales
- Le composant `AppellationSelect` permet de creer de nouvelles appellations via un dialog integre
- **Les utilisateurs peuvent creer des appellations directement**

### Comportement Quand "Autre" est Selectionne

**Pour les Types de Vin** :
- L'utilisateur selectionne "Autre" (id=7)
- Le vin est cree avec `type = 7`
- **Aucune donnee supplementaire n'est collectee**

**Pour les Appellations** :
- L'utilisateur peut cliquer "Creer une appellation"
- Un dialog s'ouvre pour saisir : nom, region, pays
- L'appellation est creee et automatiquement selectionnee

### Ameliorations Recommandees pour la Scalabilite

#### Option A : Interface Administration (Recommande)

Creer une page d'administration accessible aux super_admins pour :
1. Voir tous les types de vin et appellations
2. Ajouter/modifier/supprimer des types
3. Valider les appellations creees par les utilisateurs
4. Fusionner les doublons

#### Option B : Workflow de Validation

1. Quand un utilisateur cree une appellation, elle est marquee `validated = false`
2. Un admin recoit une notification
3. L'admin peut approuver, modifier ou rejeter
4. Une fois validee, l'appellation devient visible pour tous

#### Option C : Champ Texte Libre pour "Autre"

1. Ajouter un champ `custom_type_name` dans la table `wine`
2. Quand `type = 7` (autre), l'utilisateur peut saisir un texte libre
3. L'admin peut ensuite creer le type officiel et migrer les vins

---

## Resume des Corrections a Implementer

### Phase 1 : Corrections Critiques (Immediat)

| Priorite | Element | Action |
|----------|---------|--------|
| CRITIQUE | `search_wines` RPC | Corriger jointure `w.type = wt.id` |
| CRITIQUE | `search_wines_game` RPC | Corriger jointure `w.type = wt.id` |
| CRITIQUE | `fetch-game-questions` | Ajouter `8: 'eff'` dans le mapping |

### Phase 2 : Corrections Importantes

| Priorite | Element | Action |
|----------|---------|--------|
| HAUTE | Jointures PostgREST | Corriger syntaxe dans 3 fichiers |
| MOYENNE | WineListItem | Verifier affichage du type |

### Phase 3 : Ameliorations (Optionnel)

| Priorite | Element | Action |
|----------|---------|--------|
| BASSE | Interface admin | Creer page de gestion types/appellations |
| BASSE | Validation appellations | Ajouter workflow de validation |

---

## Details Techniques de l'Implementation

### Migration SQL pour les Fonctions RPC

```sql
-- 1. Corriger search_wines
CREATE OR REPLACE FUNCTION public.search_wines(query text)
RETURNS TABLE(...)
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  normalized_query text;
BEGIN
  normalized_query := extensions.unaccent(lower(trim(query)));
  
  RETURN QUERY
  SELECT 
    w.id,
    w.name,
    w.year,
    w.label_url,
    jsonb_build_object('id', d.id, 'name', d.name, 'logo_url', d.logo_url, 'region', d.region) as domain,
    jsonb_build_object('id', wt.id, 'type', wt.type) as wine_type
  FROM wine w
  LEFT JOIN domain d ON w.domain_id = d.id
  LEFT JOIN wine_type wt ON w.type = wt.id  -- CORRECTION ICI
  WHERE 
    w.is_playable = true
    AND (
      extensions.unaccent(lower(w.name)) ILIKE '%' || normalized_query || '%'
      OR extensions.unaccent(lower(d.name)) ILIKE '%' || normalized_query || '%'
      OR (wt.type IS NOT NULL AND extensions.unaccent(lower(wt.type::text)) ILIKE '%' || normalized_query || '%')
    )
  ORDER BY 
    CASE 
      WHEN extensions.unaccent(lower(w.name)) ILIKE normalized_query || '%' THEN 1
      WHEN extensions.unaccent(lower(d.name)) ILIKE normalized_query || '%' THEN 2
      ELSE 3
    END,
    w.created_at DESC
  LIMIT 20;
END;
$$;
```

### Mise a Jour Edge Function

```typescript
// supabase/functions/fetch-game-questions/index.ts
const wineTypeMap: { [key: number]: string } = {
  1: 'red',     // rouge
  2: 'white',   // blanc
  5: 'rose',    // rose
  7: 'all',     // autre
  8: 'eff',     // effervescent
};
```

### Correction Jointures PostgREST

Pour les fichiers utilisant `wine_type:type(id, type)`, deux approches :

**Approche 1** : Utiliser une requete separee pour le type
```typescript
// Recuperer le vin
const { data: wine } = await supabase.from('wine').select('*, domain:domain_id(...)').eq('id', id);

// Si besoin du type label, le mapper cote client
const typeLabel = WINE_TYPE_LABELS[wine.type] || 'Inconnu';
```

**Approche 2** : Creer une FK explicite et utiliser la syntaxe PostgREST avec le nom de la FK

---

## Tests a Effectuer Apres Implementation

1. **Page Game** : Verifier qu'un vin effervescent peut etre selectionne et que les questions sont chargees
2. **Recherche Globale** : Verifier que la recherche retourne le bon type de vin
3. **Formulaires** : Creer un vin de chaque type et verifier l'enregistrement
4. **Appellations** : Creer une nouvelle appellation et verifier qu'elle apparait
5. **EventDetails** : Verifier l'affichage des vins avec leur type
