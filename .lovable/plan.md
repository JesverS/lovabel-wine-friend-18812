

# Plan de Finalisation : Migration Types de Vins et Appellations

## Etat Actuel (Problemes Identifies)

| Element | Etat | Probleme |
|---------|------|----------|
| `wine.type` | `bigint` (IDs: 1,2,3,4,5) | Correct, mais contient encore 3=champagne, 4=cremant |
| `wine_type` table | 7 types (id 1-7) | Manque "effervescent" (id=8) |
| `appellation` table | 11 appellations | OK, deja creee |
| Vins champagne (type=3) | 26 vins | `appellation_id = NULL` - pas migres |
| Vins cremant (type=4) | 10 vins | `appellation_id = NULL` - pas migres |
| Types obsoletes | champagne(3), cremant(4), prosecco(6) | Doivent etre supprimes apres migration |

## Etapes de la Migration

### Etape 1 : Ajouter le type "effervescent" a wine_type

```text
+----+-------------+
| id | type        |
+----+-------------+
| 8  | effervescent|
+----+-------------+
```

Insertion dans la table `wine_type` avec id=8.

### Etape 2 : Migrer les vins champagne (type=3)

Pour les 26 vins actuellement de type "champagne" :
- Changer `type = 8` (effervescent)
- Laisser `appellation_id = NULL` (comme demande)

### Etape 3 : Migrer les vins cremant (type=4)

Pour les 10 vins actuellement de type "cremant" :
- Changer `type = 8` (effervescent)
- Laisser `appellation_id = NULL` (comme demande)

### Etape 4 : Verifier qu'aucun vin ne reference les types 3, 4, 6

Avant de supprimer, verifier que :
- `SELECT COUNT(*) FROM wine WHERE type IN (3, 4, 6)` = 0

### Etape 5 : Supprimer les anciens types obsoletes

Supprimer de `wine_type` :
- id=3 (champagne)
- id=4 (cremant)
- id=6 (prosecco)

### Etape 6 : Mettre a jour les fonctions RPC

La fonction `search_cellar_wines` fait un `LEFT JOIN wine_type wt ON wt.id = w.type` - elle est compatible avec le systeme integer.

Verification necessaire : la fonction doit supporter le nouveau type 8 (effervescent).

### Etape 7 : Mettre a jour le code frontend

Les composants qui utilisent `wine_type:type(id, type)` continueront de fonctionner. Les changements necessaires :

| Fichier | Action |
|---------|--------|
| `WineTypeSelect.tsx` | Utiliser les IDs (1,2,5,7,8) au lieu des strings |
| `AppellationSelect.tsx` | Filtrer par type_vin_suggere = 'effervescent' |
| Formulaires de creation | Envoyer l'ID numerique, pas le texte |

---

## Details Techniques de la Migration SQL

```sql
-- 1. Ajouter le type effervescent
INSERT INTO wine_type (id, type, normalized_type)
VALUES (8, 'effervescent', 'effervescent')
ON CONFLICT (id) DO NOTHING;

-- 2. Migrer les vins champagne vers effervescent (sans appellation)
UPDATE wine 
SET type = 8, appellation_id = NULL
WHERE type = 3;

-- 3. Migrer les vins cremant vers effervescent (sans appellation)
UPDATE wine 
SET type = 8, appellation_id = NULL
WHERE type = 4;

-- 4. Migrer les vins prosecco (s'il y en a)
UPDATE wine 
SET type = 8, appellation_id = NULL
WHERE type = 6;

-- 5. Supprimer les anciens types
DELETE FROM wine_type WHERE id IN (3, 4, 6);
```

## Etat Final Attendu

### Table wine_type

```text
+----+-------------+
| id | type        |
+----+-------------+
| 1  | rouge       |
| 2  | blanc       |
| 5  | rose        |
| 7  | autre       |
| 8  | effervescent|
+----+-------------+
```

### Table wine (apres migration)

- 36 vins (26 champagne + 10 cremant) ont maintenant `type = 8`
- Tous ont `appellation_id = NULL` (a remplir manuellement plus tard)

## Modifications du Code Frontend

### WineTypeSelect.tsx

Le composant actuel utilise des valeurs texte ('rouge', 'blanc', etc.). Il doit etre modifie pour :
1. Charger les types depuis la table `wine_type`
2. Utiliser les IDs numeriques comme valeurs
3. Afficher les labels texte

### Formulaires de creation de vin

Les fichiers suivants doivent envoyer l'ID (integer) au lieu du texte :
- `AddWineToDomainDialog.tsx`
- `CreateWineInDomainDialog.tsx`
- `CreateWineForPostDialog.tsx`
- `CreateWineForGameDialog.tsx`
- `AddWineDialog.tsx`

### Requetes avec jointure wine_type

Les requetes comme `wine_type:type(id, type)` doivent utiliser le bon format de jointure. Actuellement elles font un join sur le champ `type` ce qui ne fonctionne pas avec un ID.

Correction : `wine_type:type!wine_type_id_fkey(id, type)` ou utiliser la relation FK correcte.

## Risques et Mitigations

| Risque | Mitigation |
|--------|------------|
| Jointures cassees | Les jointures `ON wt.id = w.type` fonctionnent deja |
| Formulaires cassent | Migration progressive des composants |
| Donnees perdues | Migration preserve tout, appellation = NULL par choix |
| Filtres cassent | Les filtres utilisent deja p_wine_type_id (integer) |

