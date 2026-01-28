

# Ajout du Selecteur d'Appellation dans CreateWineForGameDialog

## Probleme Identifie

Le formulaire de creation de bouteille pour le jeu (`CreateWineForGameDialog.tsx`) ne permet pas de selectionner ou creer une appellation. La colonne `appellation_id` existe dans la table `wine` mais n'est jamais remplie lors de la creation via le jeu.

## Solution

Integrer le composant `AppellationSelect` existant dans le formulaire de creation de vin. Ce composant gere deja :
- La recherche d'appellations existantes
- La creation de nouvelles appellations (avec insertion dans la table `appellation`)
- Le retour de l'ID pour liaison avec la table `wine`

## Modification Unique

**Fichier** : `src/components/game/CreateWineForGameDialog.tsx`

### Changement 1 : Ajouter l'import du composant

```typescript
import { AppellationSelect } from "@/components/wine/AppellationSelect";
```

### Changement 2 : Ajouter l'etat pour l'appellation dans wineData

```typescript
const [wineData, setWineData] = useState({
  name: "",
  year: new Date().getFullYear(),
  labelFile: null as File | null,
  labelPreview: "",
  cepages: "",
  wineType: 1,
  appellationId: null as number | null,  // NOUVEAU
});
```

### Changement 3 : Ajouter le champ AppellationSelect dans le formulaire (apres le type de vin)

```typescript
{/* Appellation (optionnel) */}
<div className="space-y-2">
  <AppellationSelect
    value={wineData.appellationId}
    onChange={(id) => setWineData({ ...wineData, appellationId: id })}
    wineTypeId={wineData.wineType}
    label="Appellation"
    required={false}
    allowCreate={true}
  />
</div>
```

### Changement 4 : Inclure appellation_id dans l'insertion

```typescript
const { data: wine, error: wineError } = await supabase
  .from("wine")
  .insert({
    domain_id: selectedDomain.id,
    name: wineData.name.trim(),
    year: wineData.year,
    label_url: publicUrl,
    type: wineData.wineType,
    is_playable: true,
    cepages: wineData.cepages ? { cepages: wineData.cepages } : null,
    appellation_id: wineData.appellationId,  // NOUVEAU
  })
  // ...
```

### Changement 5 : Reset l'appellation dans resetForm

```typescript
const resetForm = () => {
  setStep(1);
  setSelectedDomain(null);
  setDomainSearch("");
  setDomains([]);
  setWineData({
    name: "",
    year: new Date().getFullYear(),
    labelFile: null,
    labelPreview: "",
    cepages: "",
    wineType: 1,
    appellationId: null,  // NOUVEAU
  });
};
```

## Flux de Creation d'une Nouvelle Appellation

```text
Utilisateur tape "Sancerre" dans AppellationSelect
       |
       v
Aucun resultat trouve
       |
       v
Click sur "Creer une appellation"
       |
       v
CreateAppellationDialog s'ouvre (deja integre dans AppellationSelect)
       |
       v
Utilisateur remplit : nom="Sancerre", region="Loire", pays="France"
       |
       v
INSERT INTO appellation (nom, region, pays) VALUES (...)
       |
       v
Retour de l'ID (ex: 42) via onChange(42, appellation)
       |
       v
wineData.appellationId = 42
       |
       v
Lors du submit, INSERT INTO wine (..., appellation_id) VALUES (..., 42)
```

## Resume

| Element | Action |
|---------|--------|
| Import | Ajouter `AppellationSelect` |
| State | Ajouter `appellationId: null` dans wineData |
| UI | Ajouter le composant apres le select de type de vin |
| Insert | Ajouter `appellation_id: wineData.appellationId` |
| Reset | Reinitialiser `appellationId` a null |

