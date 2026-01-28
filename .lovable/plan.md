
# Correction de WineDetailsDialog.tsx pour les Sliders Dynamiques

## Probleme Identifie

Le fichier `WineDetailsDialog.tsx` n'a pas ete mis a jour lors de l'implementation des sliders dynamiques. Il utilise encore :
- L'ancienne interface `TastingDetails` avec les cles `acidity`, `tannins`, `body`, `sweetness`
- Des sliders hardcodes avec les labels fixes (Acidite, Tanins, Corps, Douceur)
- L'ancien format de sauvegarde

Ceci fait que ce composant ne beneficie pas des labels dynamiques selon le type de vin.

## Verification Effectuee

| Fichier | Status | Notes |
|---------|--------|-------|
| `WineInteractionDialog.tsx` | OK | Utilise `TastingSliders` avec `wine.type` |
| `CellarWineDetailsDialog.tsx` | OK | Utilise `TastingSliders` avec `wineData.wine?.type` |
| `SpontaneousTastingDialog.tsx` | OK | Utilise `TastingSliders` avec `selectedWine?.type` |
| `WineDetails.tsx` | OK | Utilise `TastingSlidersGrid` |
| `WineTastingNotes.tsx` | OK | Utilise labels dynamiques |
| `PostCard.tsx` | OK | Passe `wineTypeId={wine?.type}` |
| `PostDetails.tsx` | OK | Passe `wineTypeId={post.wine?.type}` |
| `SharedPost.tsx` | OK | Passe `wineTypeId={post.wine?.type}` |
| `useSocialFeed.ts` | OK | Recupere `type` dans la requete |
| **`WineDetailsDialog.tsx`** | **A CORRIGER** | Utilise encore l'ancien format |

## Solution Proposee

Modifier `WineDetailsDialog.tsx` pour :

### 1. Mettre a jour les imports

```typescript
import { TastingSliders } from '@/components/TastingSliders';
import { TastingDetails, migrateTastingDetails, tastingDetailsToDbFormat } from '@/lib/tastingSliderConfig';
```

### 2. Remplacer l'interface TastingDetails locale

Supprimer l'interface locale (lignes 56-63) et utiliser celle importee de `tastingSliderConfig.ts`.

### 3. Mettre a jour l'etat initial

```typescript
const [tastingDetails, setTastingDetails] = useState<TastingDetails>({
  rating: 5.0,
  slot1: 5.0,
  slot2: 5.0,
  slot3: 5.0,
  slot4: 5.0,
  remarks: "",
});
```

### 4. Adapter la lecture des donnees existantes (useEffect)

Utiliser `migrateTastingDetails` pour la retrocompatibilite :

```typescript
if (noticeData.details && typeof noticeData.details === 'object' && !Array.isArray(noticeData.details)) {
  const migrated = migrateTastingDetails(noticeData.details);
  setTastingDetails(migrated);
}
```

### 5. Adapter la sauvegarde

Utiliser `tastingDetailsToDbFormat` pour sauvegarder au nouveau format :

```typescript
const roundedDetails = tastingDetailsToDbFormat(tastingDetails);
```

### 6. Remplacer les sliders hardcodes par le composant TastingSliders

Remplacer les 4 blocs de sliders (Acidite, Tanins, Corps, Douceur) par :

```typescript
<TastingSliders
  wineTypeId={wine.type}
  values={{
    slot1: tastingDetails.slot1,
    slot2: tastingDetails.slot2,
    slot3: tastingDetails.slot3,
    slot4: tastingDetails.slot4,
  }}
  onChange={(key, value) => setTastingDetails(prev => ({ ...prev, [key]: value }))}
/>
```

## Resume des Modifications

| Element | Avant | Apres |
|---------|-------|-------|
| Interface | `TastingDetails` locale | Import de `tastingSliderConfig` |
| Etat | `acidity, tannins, body, sweetness` | `slot1, slot2, slot3, slot4` |
| Lecture | Directe | Via `migrateTastingDetails()` |
| Sauvegarde | Manuelle | Via `tastingDetailsToDbFormat()` |
| UI Sliders | 4 blocs hardcodes | Composant `TastingSliders` |
| Labels | Fixes | Dynamiques selon `wine.type` |

## Impact

Apres cette correction :
- Les utilisateurs verront les bons labels selon le type de vin dans WineDetailsDialog
- Vin rouge : Fruite, Epice, Tannique, Boise
- Vin blanc : Acidite, Sec, Sucrosite, Gras
- Rose : Acidite, Fruite, Sec, Frais
- Effervescent : Acidite, Sec, Sucrosite, Effervescence
- Les donnees existantes seront automatiquement migrees a la lecture
- Les nouvelles sauvegardes utiliseront le format `slot1-4`

## Fichier Unique a Modifier

`src/components/WineDetailsDialog.tsx`
