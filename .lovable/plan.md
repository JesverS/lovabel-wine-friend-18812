
# Plan de Migration : Types de Vins et Appellations

## Resume du Probleme

La base de donnees presente une confusion entre **types de vins** et **appellations** :

| Actuel (incorrect) | Correct |
|-------------------|---------|
| Type: Champagne | Type: Effervescent, Appellation: Champagne |
| Type: Cremant | Type: Effervescent, Appellation: Cremant de [Region] |
| Type: Prosecco | Type: Effervescent, Appellation: Prosecco |

**Objectif** : Avoir uniquement 5 types de vins (Rouge, Blanc, Rose, Effervescent, Autre) et introduire une table `appellation` pour les denominations d'origine.

---

## Phase 1 : Preparation de la Base de Donnees

### Etape 1.1 : Creer la table `appellation`

```sql
CREATE TABLE public.appellation (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(255) NOT NULL UNIQUE,
  region VARCHAR(255),
  pays VARCHAR(100) DEFAULT 'France',
  type_vin_suggere INTEGER REFERENCES wine_type(id),
  description TEXT,
  normalized_nom TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger pour la recherche accent-insensitive
CREATE TRIGGER trg_appellation_normalize_nom
  BEFORE INSERT OR UPDATE ON appellation
  FOR EACH ROW
  EXECUTE FUNCTION appellation_normalize_nom();

-- Index pour la recherche
CREATE INDEX idx_appellation_normalized_nom ON appellation USING gin(normalized_nom gin_trgm_ops);
```

### Etape 1.2 : Ajouter le type "Effervescent" a wine_type

```sql
-- Ajouter le nouveau type Effervescent (id = 8)
INSERT INTO wine_type (id, type, normalized_type) 
VALUES (8, 'effervescent', 'effervescent');
```

### Etape 1.3 : Ajouter la colonne `appellation` a la table `wine`

```sql
ALTER TABLE wine 
ADD COLUMN appellation_id INTEGER REFERENCES appellation(id);

CREATE INDEX idx_wine_appellation ON wine(appellation_id);
```

---

## Phase 2 : Migration des Donnees Existantes

### Etape 2.1 : Creer les appellations initiales

```sql
INSERT INTO appellation (nom, region, pays, type_vin_suggere, description)
VALUES 
  ('Champagne', 'Champagne', 'France', 8, 'Appellation d''origine controlee pour les vins effervescents de Champagne'),
  ('Cremant d''Alsace', 'Alsace', 'France', 8, 'Vin effervescent AOC d''Alsace'),
  ('Cremant de Bourgogne', 'Bourgogne', 'France', 8, 'Vin effervescent AOC de Bourgogne'),
  ('Cremant de Loire', 'Loire', 'France', 8, 'Vin effervescent AOC de Loire'),
  ('Cremant de Bordeaux', 'Bordeaux', 'France', 8, 'Vin effervescent AOC de Bordeaux'),
  ('Cremant de Limoux', 'Languedoc', 'France', 8, 'Vin effervescent AOC de Limoux'),
  ('Cremant du Jura', 'Jura', 'France', 8, 'Vin effervescent AOC du Jura'),
  ('Prosecco', 'Venetie', 'Italie', 8, 'Appellation italienne pour vins effervescents'),
  ('Cava', 'Catalogne', 'Espagne', 8, 'Appellation espagnole pour vins effervescents'),
  ('Franciacorta', 'Lombardie', 'Italie', 8, 'Appellation italienne premium'),
  ('Sekt', 'Allemagne', 'Allemagne', 8, 'Vin mousseux allemand');
```

### Etape 2.2 : Migrer les vins "Champagne" (type=3)

```sql
-- Affecter l'appellation Champagne aux vins actuellement de type "champagne"
UPDATE wine 
SET appellation_id = (SELECT id FROM appellation WHERE nom = 'Champagne')
WHERE type = 3;

-- Changer leur type vers "effervescent" (id=8)
UPDATE wine 
SET type = 8 
WHERE type = 3;
```

### Etape 2.3 : Migrer les vins "Cremant" (type=4)

```sql
-- Pour simplifier, attribuer "Cremant de Bourgogne" par defaut
-- (peut etre affine manuellement apres)
UPDATE wine 
SET appellation_id = (SELECT id FROM appellation WHERE nom = 'Cremant de Bourgogne')
WHERE type = 4;

-- Changer leur type vers "effervescent"
UPDATE wine 
SET type = 8 
WHERE type = 4;
```

### Etape 2.4 : Migrer les vins "Prosecco" (type=6) si existants

```sql
UPDATE wine 
SET appellation_id = (SELECT id FROM appellation WHERE nom = 'Prosecco')
WHERE type = 6;

UPDATE wine 
SET type = 8 
WHERE type = 6;
```

---

## Phase 3 : Nettoyage de la Table wine_type

### Etape 3.1 : Supprimer les anciens types devenus obsoletes

```sql
-- Supprimer les types qui sont maintenant des appellations
-- ATTENTION: S'assurer qu'aucun vin ne reference plus ces types
DELETE FROM wine_type WHERE id IN (3, 4, 6);
```

**Etat final de wine_type :**

| id | type |
|----|------|
| 1 | rouge |
| 2 | blanc |
| 5 | rose |
| 8 | effervescent |
| 7 | autre |

---

## Phase 4 : Modifications du Code Frontend

### Fichiers a Modifier

| Fichier | Modification |
|---------|--------------|
| `CreateWineForGameDialog.tsx` | Remplacer types hardcodes, ajouter select appellation |
| `AddWineToDomainDialog.tsx` | Ajouter select type + appellation |
| `AddWineDialog.tsx` | Ajouter select type + appellation |
| `CreateWineForPostDialog.tsx` | Ajouter select type + appellation |
| `CreateWineInDomainDialog.tsx` | Ajouter select type + appellation |
| `WineSearchFilter.tsx` | Ajouter filtre par appellation |
| `CellarCatalog.tsx` | Afficher appellation, ajouter filtre |
| Queries avec `wine_type:type(type)` | Ajouter `appellation:appellation_id(nom, region)` |

### Composant Reutilisable a Creer

```typescript
// src/components/wine/AppellationSelect.tsx
interface AppellationSelectProps {
  value: number | null;
  onChange: (id: number | null) => void;
  wineTypeId?: number; // Pour filtrer les appellations par type de vin
  allowCreate?: boolean; // Pour permettre la creation d'une nouvelle appellation
}
```

### Logique de Selection Type/Appellation

1. L'utilisateur selectionne d'abord le **type de vin** (Rouge, Blanc, Rose, Effervescent, Autre)
2. Si le type est "Effervescent", proposer la liste des appellations effervescentes (Champagne, Cremant, Prosecco, etc.)
3. Pour tous les types, permettre de selectionner une appellation optionnelle
4. Ajouter un bouton "Creer une appellation" si elle n'existe pas

---

## Phase 5 : Fonctionnalite de Creation d'Appellation

### Nouveau Composant Dialog

```typescript
// src/components/wine/CreateAppellationDialog.tsx
interface CreateAppellationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAppellationCreated: (appellation: any) => void;
  initialName?: string;
  suggestedType?: number;
}
```

### Champs du Formulaire

- **Nom** (obligatoire) : ex. "Cotes du Rhone"
- **Region** (optionnel) : ex. "Rhone"
- **Pays** (defaut: France)
- **Type de vin suggere** (optionnel) : pour filtrer les appellations

---

## Resume des Migrations SQL

### Migration 1 : Structure

```sql
-- 1. Creer fonction de normalisation
CREATE OR REPLACE FUNCTION public.appellation_normalize_nom()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  NEW.normalized_nom := extensions.unaccent(lower(NEW.nom));
  RETURN NEW;
END;
$$;

-- 2. Creer table appellation
CREATE TABLE public.appellation (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(255) NOT NULL UNIQUE,
  region VARCHAR(255),
  pays VARCHAR(100) DEFAULT 'France',
  type_vin_suggere INTEGER REFERENCES wine_type(id),
  description TEXT,
  normalized_nom TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Trigger
CREATE TRIGGER trg_appellation_normalize_nom
  BEFORE INSERT OR UPDATE ON appellation
  FOR EACH ROW
  EXECUTE FUNCTION appellation_normalize_nom();

-- 4. Index
CREATE INDEX idx_appellation_normalized_nom 
  ON appellation USING gin(normalized_nom extensions.gin_trgm_ops);

-- 5. Ajouter type effervescent
INSERT INTO wine_type (id, type, normalized_type) 
VALUES (8, 'effervescent', 'effervescent')
ON CONFLICT (id) DO NOTHING;

-- 6. Ajouter colonne appellation a wine
ALTER TABLE wine 
ADD COLUMN appellation_id INTEGER REFERENCES appellation(id);

CREATE INDEX idx_wine_appellation ON wine(appellation_id);

-- 7. RLS pour appellation (lecture publique, ecriture authentifie)
ALTER TABLE appellation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Appellations visibles par tous" 
  ON appellation FOR SELECT USING (true);

CREATE POLICY "Utilisateurs authentifies peuvent creer des appellations"
  ON appellation FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);
```

### Migration 2 : Donnees

```sql
-- Inserer les appellations principales
INSERT INTO appellation (nom, region, pays, type_vin_suggere, description) VALUES
  ('Champagne', 'Champagne', 'France', 8, 'AOC Champagne'),
  ('Cremant de Bourgogne', 'Bourgogne', 'France', 8, 'AOC Cremant de Bourgogne'),
  ('Cremant d''Alsace', 'Alsace', 'France', 8, 'AOC Cremant d''Alsace'),
  ('Cremant de Loire', 'Loire', 'France', 8, 'AOC Cremant de Loire'),
  ('Prosecco', 'Venetie', 'Italie', 8, 'DOC/DOCG Prosecco'),
  ('Cava', 'Catalogne', 'Espagne', 8, 'DO Cava');

-- Migrer les vins champagne -> effervescent + appellation champagne
UPDATE wine 
SET 
  appellation_id = (SELECT id FROM appellation WHERE nom = 'Champagne'),
  type = 8
WHERE type = 3;

-- Migrer les vins cremant -> effervescent + appellation cremant
UPDATE wine 
SET 
  appellation_id = (SELECT id FROM appellation WHERE nom = 'Cremant de Bourgogne'),
  type = 8
WHERE type = 4;

-- Migrer les vins prosecco (si existants)
UPDATE wine 
SET 
  appellation_id = (SELECT id FROM appellation WHERE nom = 'Prosecco'),
  type = 8
WHERE type = 6;
```

### Migration 3 : Nettoyage (A EXECUTER APRES VERIFICATION)

```sql
-- Supprimer les anciens types devenus obsoletes
-- UNIQUEMENT apres avoir verifie que plus aucun vin ne les utilise
DELETE FROM wine_type WHERE id IN (3, 4, 6);
```

---

## Ordre d'Execution Recommande

1. **Migration 1** : Creer la structure (table appellation, colonne wine.appellation_id)
2. **Migration 2** : Migrer les donnees existantes
3. **Verification** : S'assurer que tous les vins champagne/cremant/prosecco ont ete migres
4. **Code Frontend** : Modifier les formulaires et affichages
5. **Tests** : Verifier que tout fonctionne
6. **Migration 3** : Supprimer les anciens types (optionnel, peut etre fait plus tard)

---

## Risques et Precautions

| Risque | Mitigation |
|--------|------------|
| Perte de donnees d'appellation | Migration preserve les infos avant de changer le type |
| Formulaires casses | Les anciennes valeurs (3, 4, 6) continueront a fonctionner jusqu'a la suppression |
| Recherche cassee | Les fonctions RPC doivent etre mises a jour pour inclure appellation |
| Types hardcodes dans le code | Mise a jour progressive des composants |

---

## Impact sur les Fonctionnalites

- **Recherche de vins** : Pourra filtrer par type ET par appellation
- **Jeu de degustation** : Affichera le bon type + appellation
- **Cave virtuelle** : Filtres ameliores
- **Posts et degustations** : Information plus precise

Ce plan est concu pour etre execute en plusieurs etapes sans casser l'existant.
