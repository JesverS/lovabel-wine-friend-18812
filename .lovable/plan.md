
# Correction de ShareStoryDialog.tsx pour les Sliders Dynamiques

## Probleme Identifie

Le fichier `ShareStoryDialog.tsx` est le **dernier composant** qui n'utilise pas le systeme de sliders dynamiques. Il affiche les labels hardcodes ("Acidite", "Tanins", "Corps", "Douceur") au lieu de s'adapter au type de vin.

### Analyse du fichier actuel

| Element | Probleme |
|---------|----------|
| Interface `WineNotice` (lignes 15-21) | Utilise `acidity, tannins, body, sweetness` |
| Interface `Wine` (lignes 23-32) | Ne contient pas le champ `type` |
| Composant `TastingBarCard` (ligne 179-182) | Labels hardcodes |
| `StoryTemplateCard` | Accede a `wineNotice.acidity`, etc. |

## Solution Proposee

### 1. Ajouter le type de vin dans l'interface Wine

```typescript
interface Wine {
  id: string;
  name: string;
  label_url?: string;
  color?: string;
  type?: number | null; // AJOUTER
  domain?: {
    name: string;
    region?: string;
  };
}
```

### 2. Mettre a jour l'interface WineNotice pour supporter les deux formats

```typescript
interface WineNotice {
  rating: number;
  // Ancien format (retrocompatibilite)
  acidity?: number;
  tannins?: number;
  body?: number;
  sweetness?: number;
  // Nouveau format
  slot1?: number;
  slot2?: number;
  slot3?: number;
  slot4?: number;
}
```

### 3. Importer les utilitaires de configuration

```typescript
import { getSlidersForWineType, migrateTastingDetails } from '@/lib/tastingSliderConfig';
```

### 4. Modifier StoryTemplateCard pour accepter le wineTypeId

```typescript
const StoryTemplateCard = ({
  wineName,
  domainName,
  imageUrl,
  wineNotice,
  wineTypeId,  // AJOUTER
  content,
  backgroundColor,
}: {
  // ...
  wineTypeId?: number | null;  // AJOUTER
  // ...
}) => {
  // Migrer et obtenir les labels dynamiques
  const migratedNotice = wineNotice ? migrateTastingDetails(wineNotice) : null;
  const sliders = getSlidersForWineType(wineTypeId);
  
  // ...
  
  {/* Tasting bars grid avec labels dynamiques */}
  <div className="grid grid-cols-2 gap-x-12 gap-y-6 mt-4">
    <TastingBarCard label={sliders.slot1.label} value={migratedNotice.slot1} />
    <TastingBarCard label={sliders.slot2.label} value={migratedNotice.slot2} />
    <TastingBarCard label={sliders.slot3.label} value={migratedNotice.slot3} />
    <TastingBarCard label={sliders.slot4.label} value={migratedNotice.slot4} />
  </div>
}
```

### 5. Passer le wineTypeId au composant

Dans le rendu principal :

```typescript
<StoryTemplateCard
  wineName={wineName}
  domainName={domainName}
  imageUrl={displayImage}
  wineNotice={wineNotice}
  wineTypeId={wine?.type}  // AJOUTER
  content={post.content}
  backgroundColor={selectedColor}
/>
```

## Resume des Modifications

| Element | Avant | Apres |
|---------|-------|-------|
| Interface `Wine` | Pas de `type` | `type?: number \| null` |
| Interface `WineNotice` | `acidity, tannins, body, sweetness` | Support des deux formats |
| Labels | Hardcodes | Dynamiques via `getSlidersForWineType` |
| Valeurs | `wineNotice.acidity` | `migratedNotice.slot1` via migration |

## Impact

Apres cette correction, les stories Instagram generees afficheront les bons labels selon le type de vin :
- Vin rouge/autre : Fruite, Epice, Tannique, Boise
- Vin blanc : Acidite, Sec, Sucrosite, Gras
- Rose : Acidite, Fruite, Sec, Frais
- Effervescent : Acidite, Sec, Sucrosite, Effervescence

## Verification Finale

Apres cette correction, **100% des composants** du site utiliseront le systeme de sliders dynamiques :

| Composant | Status |
|-----------|--------|
| `TastingSliders.tsx` | OK - Composant central |
| `tastingSliderConfig.ts` | OK - Configuration |
| `WineDetailsDialog.tsx` | OK - Utilise TastingSliders |
| `WineInteractionDialog.tsx` | OK - Utilise TastingSliders |
| `CellarWineDetailsDialog.tsx` | OK - Utilise TastingSliders |
| `SpontaneousTastingDialog.tsx` | OK - Utilise TastingSliders |
| `WineDetails.tsx` | OK - Utilise TastingSlidersGrid |
| `WineTastingNotes.tsx` | OK - Labels dynamiques |
| `PostCard.tsx` | OK - Passe wineTypeId |
| `PostDetails.tsx` | OK - Passe wineTypeId |
| `SharedPost.tsx` | OK - Passe wineTypeId |
| `useSocialFeed.ts` | OK - Recupere type |
| **`ShareStoryDialog.tsx`** | **A CORRIGER** |

## Fichier Unique a Modifier

`src/components/ShareStoryDialog.tsx`
