

# Plan : Corriger le trou dans CreateWineForGameDialog + enrichir le RPC

## Probleme identifie

Le composant `CreateWineForGameDialog` (creation de vin pour le jeu) fait un `supabase.from("wine").insert(...)` direct sans passer par le RPC `find_or_create_wine`. C'est le seul chemin de creation de vin qui n'est pas protege contre les doublons.

De plus, ce composant utilise deux colonnes que le RPC actuel ne gere pas : `is_playable` et `cepages`.

## Solution

### 1. Migration SQL : enrichir le RPC

Ajouter deux parametres optionnels a `find_or_create_wine` :
- `p_is_playable boolean DEFAULT false`
- `p_cepages jsonb DEFAULT NULL`

Et les inclure dans l'INSERT de la fonction. Quand un doublon est detecte (vin existant retourne), ces champs sont ignores (le vin existant garde ses propres valeurs).

### 2. Modifier CreateWineForGameDialog

Remplacer le `.from("wine").insert(...)` (lignes 116-134) par un appel a `supabase.rpc('find_or_create_wine', {...})`, puis un `.from('wine').select(...)` pour recuperer l'objet complet avec le domaine (necessaire pour le callback `onWineCreated`).

Si `was_created` est `false`, afficher "Vin existant utilise" au lieu de "Bouteille creee avec succes".

### 3. Mise a jour des types TypeScript

Le fichier `src/integrations/supabase/types.ts` sera automatiquement mis a jour avec les nouveaux parametres du RPC.

## Fichiers concernes

| Fichier | Action |
|---------|--------|
| Migration SQL | Ajouter `p_is_playable` et `p_cepages` au RPC `find_or_create_wine` |
| `src/integrations/supabase/types.ts` | Mise a jour des types RPC |
| `src/components/game/CreateWineForGameDialog.tsx` | Remplacer `.insert()` par `rpc('find_or_create_wine')` |

## Section technique

### Migration SQL

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
  p_is_playable boolean DEFAULT false,
  p_cepages jsonb DEFAULT NULL
)
-- RETURNS et corps identiques, sauf l'INSERT qui inclut is_playable et cepages
```

### CreateWineForGameDialog (lignes 116-134)

Avant :
```typescript
const { data: wine } = await supabase
  .from("wine")
  .insert({ domain_id, name, year, label_url, type, is_playable: true, cepages, appellation_id })
  .select(`id, name, year, label_url, type, domain:domain_id(...)`)
  .single();
```

Apres :
```typescript
const { data: rpcResult } = await supabase.rpc('find_or_create_wine', {
  p_name: name, p_domain_id: selectedDomain.id, p_year: year,
  p_label_url: publicUrl, p_type: wineType, p_appellation_id: appellationId,
  p_is_playable: true, p_cepages: cepages ? { cepages } : null,
});

const result = rpcResult?.[0];

// Recuperer l'objet complet pour le callback
const { data: wine } = await supabase
  .from('wine')
  .select(`id, name, year, label_url, type, domain:domain_id(id, name, logo_url, region)`)
  .eq('id', result.wine_id)
  .single();
```

## Couverture finale apres ce correctif

| Chemin de creation | Protege |
|--------------------|---------|
| Post social (CreateWineForPostDialog) | Oui |
| Page domaine (AddWineToDomainDialog) | Oui |
| Event (CreateWineInDomainDialog) | Oui |
| Cave (AddWineDialog) | Oui |
| Jeu (CreateWineForGameDialog) | Oui (apres ce correctif) |

Tous les chemins de creation de vin passeront par le RPC `find_or_create_wine`. Il n'y aura plus aucun `.insert()` direct sur la table `wine` dans le frontend.

