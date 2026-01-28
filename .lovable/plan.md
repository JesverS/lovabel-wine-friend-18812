
# Adaptation des Sliders de Degustation selon le Type de Vin

## Contexte et Probleme

Les sliders actuels (`acidite`, `tanins`, `corps`, `douceur`) ne sont pas pertinents pour tous les types de vins :
- Les **tanins** n'existent que dans les vins rouges
- Pour un **blanc**, on prefere parler de **gras** plutot que de **corps**
- Pour un **effervescent**, on veut noter l'**effervescence**

### Donnees existantes en base
Les degustations actuelles stockent : `{ acidity, tannins, body, sweetness, rating, remarks }`

Exemple de donnees reelles :
- Vin blanc (type=2) avec `tannins: 0` ou `tannins: 3` (non pertinent)
- Vin effervescent (type=8) avec `tannins: 5` (encore moins pertinent)

## Solution Proposee : Mapping Semantique

### Principe cle : Conserver les memes cles JSON, changer uniquement les labels

Au lieu de creer de nouvelles cles dans le JSON qui casseraient les anciennes donnees, on **reutilise les 4 slots existants** en changeant simplement leur signification visuelle selon le type de vin.

```text
Slot JSON    | Rouge/Autre | Blanc      | Rose     | Effervescent
-------------|-------------|------------|----------|---------------
slot1        | Fruite      | Acidite    | Acidite  | Acidite
slot2        | Epice       | Sec        | Fruite   | Sec
slot3        | Tannique    | Sucrosite  | Sec      | Sucrosite
slot4        | Boise       | Gras       | Frais    | Effervescence
```

### Structure de configuration centralisee

Creer un nouveau fichier `src/lib/tastingSliderConfig.ts` :

```typescript
// Types de vin: 1=rouge, 2=blanc, 5=rose, 7=autre, 8=effervescent

export interface SliderConfig {
  key: 'slot1' | 'slot2' | 'slot3' | 'slot4';
  label: string;
  lowLabel: string;   // Description du 0
  highLabel: string;  // Description du 10
}

export interface WineTypeSliders {
  slot1: SliderConfig;
  slot2: SliderConfig;
  slot3: SliderConfig;
  slot4: SliderConfig;
}

const ROUGE_SLIDERS: WineTypeSliders = {
  slot1: { key: 'slot1', label: 'Fruite', lowLabel: 'Peu fruite', highLabel: 'Tres fruite' },
  slot2: { key: 'slot2', label: 'Epice', lowLabel: 'Peu epice', highLabel: 'Tres epice' },
  slot3: { key: 'slot3', label: 'Tannique', lowLabel: 'Tres doux', highLabel: 'Tres tannique' },
  slot4: { key: 'slot4', label: 'Boise', lowLabel: 'Peu boise', highLabel: 'Tres boise' },
};

const BLANC_SLIDERS: WineTypeSliders = {
  slot1: { key: 'slot1', label: 'Acidite', lowLabel: 'Tres faible', highLabel: 'Tres marquee' },
  slot2: { key: 'slot2', label: 'Sec', lowLabel: 'Sucre', highLabel: 'Tres sec' },
  slot3: { key: 'slot3', label: 'Sucrosite', lowLabel: 'Tres sec', highLabel: 'Tres sucre' },
  slot4: { key: 'slot4', label: 'Gras', lowLabel: 'Tres leger', highLabel: 'Tres gras' },
};

const ROSE_SLIDERS: WineTypeSliders = {
  slot1: { key: 'slot1', label: 'Acidite', lowLabel: 'Tres faible', highLabel: 'Tres marquee' },
  slot2: { key: 'slot2', label: 'Fruite', lowLabel: 'Peu fruite', highLabel: 'Tres fruite' },
  slot3: { key: 'slot3', label: 'Sec', lowLabel: 'Sucre', highLabel: 'Tres sec' },
  slot4: { key: 'slot4', label: 'Frais', lowLabel: 'Lourd', highLabel: 'Tres frais' },
};

const EFFERVESCENT_SLIDERS: WineTypeSliders = {
  slot1: { key: 'slot1', label: 'Acidite', lowLabel: 'Tres faible', highLabel: 'Tres marquee' },
  slot2: { key: 'slot2', label: 'Sec', lowLabel: 'Doux', highLabel: 'Brut' },
  slot3: { key: 'slot3', label: 'Sucrosite', lowLabel: 'Tres sec', highLabel: 'Tres sucre' },
  slot4: { key: 'slot4', label: 'Effervescence', lowLabel: 'Peu petillant', highLabel: 'Tres petillant' },
};

export function getSlidersForWineType(wineTypeId: number | null): WineTypeSliders {
  switch (wineTypeId) {
    case 2: return BLANC_SLIDERS;      // blanc
    case 5: return ROSE_SLIDERS;       // rose
    case 8: return EFFERVESCENT_SLIDERS; // effervescent
    case 1: // rouge
    case 7: // autre
    default: return ROUGE_SLIDERS;
  }
}
```

### Structure JSON mise a jour

Modifier `TastingDetails` pour utiliser des slots generiques :

```typescript
interface TastingDetails {
  rating: number;
  slot1: number;  // Ancien: acidity
  slot2: number;  // Ancien: tannins
  slot3: number;  // Ancien: body
  slot4: number;  // Ancien: sweetness
  remarks: string;
}
```

### Migration des anciennes donnees (lecture seule)

Lors de la **lecture** des donnees existantes, mapper les anciennes cles vers les nouvelles :

```typescript
function migrateTastingDetails(details: any): TastingDetails {
  // Si nouvelles cles deja presentes, les utiliser
  if ('slot1' in details) {
    return {
      rating: details.rating ?? 5.0,
      slot1: details.slot1 ?? 5.0,
      slot2: details.slot2 ?? 5.0,
      slot3: details.slot3 ?? 5.0,
      slot4: details.slot4 ?? 5.0,
      remarks: details.remarks || '',
    };
  }
  
  // Sinon, migrer les anciennes cles
  return {
    rating: details.rating ?? 5.0,
    slot1: details.acidity ?? 5.0,
    slot2: details.tannins ?? 5.0,
    slot3: details.body ?? 5.0,
    slot4: details.sweetness ?? 5.0,
    remarks: details.remarks || '',
  };
}
```

## Gestion de la Retrocompatibilite

### Probleme : Un vin blanc note avec les sliders "rouge"

**Scenario** : Un utilisateur a note un vin blanc avec les anciens sliders (acidity, tannins, body, sweetness). Si on affiche maintenant les sliders "blanc" (Acidite, Sec, Sucrosite, Gras), les valeurs stockees seront affichees mais leur signification aura change.

**Solution retenue** : 

1. **A l'affichage (lecture)** : Toujours afficher les sliders correspondant au type de vin ACTUEL
2. **Les valeurs numeriques** restent les memes (ex: slot2 = 5.0)
3. **Le label change** selon le type (slot2 = "Tanins" pour rouge, "Sec" pour blanc)

**Pourquoi c'est acceptable** :
- Les anciennes notes gardent leur valeur numerique
- L'utilisateur peut re-sauvegarder pour "confirmer" ses notes avec la nouvelle semantique
- Pas de perte de donnees

### Alternative consideree mais rejetee : Stocker le wine_type dans les details

On aurait pu stocker `{ wineTypeAtRating: 1, ... }` pour savoir avec quels sliders la note a ete faite. Mais cela complexifie enormement le code d'affichage et ne resout pas vraiment le probleme (que fait-on si le type a change ?).

## Fichiers a Modifier

### 1. Nouveau fichier : `src/lib/tastingSliderConfig.ts`
Configuration centralisee des sliders par type de vin

### 2. Composant reutilisable : `src/components/TastingSliders.tsx`
Nouveau composant qui prend en props :
- `wineTypeId: number | null`
- `values: TastingDetails`
- `onChange: (values: TastingDetails) => void`
- `readOnly?: boolean` (pour l'affichage)

### 3. Modifier : `src/components/WineInteractionDialog.tsx`
- Ajouter la prop `wineType` depuis l'interface Wine
- Utiliser le nouveau composant `TastingSliders`
- Appliquer `migrateTastingDetails` lors de la lecture

### 4. Modifier : `src/components/CellarWineDetailsDialog.tsx`
- Le type de vin est deja disponible via `wineData.wine?.type`
- Remplacer les sliders hardcodes par `TastingSliders`

### 5. Modifier : `src/components/SpontaneousTastingDialog.tsx`
- Recuperer le type du vin selectionne via `selectedWine?.type`
- Utiliser `TastingSliders`

### 6. Modifier : `src/pages/WineDetails.tsx`
- Le type est disponible via `wine.type`
- Utiliser `TastingSliders`

### 7. Modifier : `src/components/WineTastingNotes.tsx` (affichage seul)
- Ajouter `wineTypeId` en prop
- Afficher les labels corrects selon le type

### 8. Mettre a jour : `src/lib/validation-schemas.ts`
- Adapter le schema pour accepter `slot1-4` en plus de l'ancien format

## Composant TastingSliders

```typescript
interface TastingSlidersProps {
  wineTypeId: number | null;
  values: {
    slot1: number;
    slot2: number;
    slot3: number;
    slot4: number;
  };
  onChange: (key: 'slot1' | 'slot2' | 'slot3' | 'slot4', value: number) => void;
  readOnly?: boolean;
}

export function TastingSliders({ wineTypeId, values, onChange, readOnly }: TastingSlidersProps) {
  const sliders = getSlidersForWineType(wineTypeId);
  
  return (
    <div className="space-y-4">
      {(['slot1', 'slot2', 'slot3', 'slot4'] as const).map((key) => {
        const config = sliders[key];
        return (
          <div key={key}>
            <Label>{config.label} : {values[key].toFixed(1)}/10</Label>
            <p className="text-xs text-muted-foreground mb-2">
              0 = {config.lowLabel} - 10 = {config.highLabel}
            </p>
            <Slider
              value={[values[key]]}
              onValueChange={([v]) => onChange(key, Math.round(v * 10) / 10)}
              min={0}
              max={10}
              step={0.1}
              disabled={readOnly}
            />
          </div>
        );
      })}
    </div>
  );
}
```

## Resume des Actions

| Etape | Action |
|-------|--------|
| 1 | Creer `src/lib/tastingSliderConfig.ts` avec la config par type |
| 2 | Creer `src/components/TastingSliders.tsx` composant reutilisable |
| 3 | Ajouter fonction `migrateTastingDetails` pour retrocompatibilite |
| 4 | Modifier `WineInteractionDialog.tsx` - utiliser nouveau composant |
| 5 | Modifier `CellarWineDetailsDialog.tsx` - utiliser nouveau composant |
| 6 | Modifier `SpontaneousTastingDialog.tsx` - utiliser nouveau composant |
| 7 | Modifier `WineDetails.tsx` - utiliser nouveau composant |
| 8 | Modifier `WineTastingNotes.tsx` - adapter l'affichage |
| 9 | Mettre a jour `validation-schemas.ts` pour le nouveau format |

## Avantages de cette Solution

1. **Pas de migration de donnees** - Les anciennes donnees restent lisibles
2. **Code centralise** - Un seul endroit pour modifier les labels
3. **Composant reutilisable** - Moins de code duplique
4. **Retrocompatibilite totale** - Les notes existantes conservent leurs valeurs
5. **Evolutif** - Facile d'ajouter de nouveaux types de vin
