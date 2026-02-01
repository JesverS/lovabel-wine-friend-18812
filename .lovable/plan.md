

# Plan d'Implementation : Scanner IA Premium avec Matching Intelligent

## Resume des Modifications

Transformer le scanner d'etiquettes en fonctionnalite premium reservee aux utilisateurs avec un role dans `user_roles`, avec matching intelligent des domaines et appellations, et fallback vers le formulaire manuel pour les utilisateurs sans role.

---

## Architecture

```text
                    Utilisateur scanne une etiquette
                               |
                               v
                    Verification role user_roles
                              / \
                             /   \
                    A un role    Pas de role
                         |            |
                         v            v
                 Scanner IA      Formulaire manuel
                 (Premium)       (Standard)
                         |
                         v
              Edge Function scan-wine-label
                         |
                         v
              Matching intelligent
              - Domaine (similarity >= 0.8)
              - Appellation (similarity >= 0.8)
              - Region (enum ou creation custom)
                         |
                         v
              Pre-remplissage formulaire
              + Image scannee = etiquette
```

---

## Fichiers a Modifier/Creer

| Fichier | Action | Description |
|---------|--------|-------------|
| `src/hooks/useUserRole.ts` | CREER | Hook pour verifier si l'utilisateur a un role |
| `supabase/functions/scan-wine-label/index.ts` | MODIFIER | Ajouter matching domaine/appellation + creation |
| `src/hooks/useWineLabelScan.ts` | MODIFIER | Retourner aussi l'image et les IDs matches |
| `src/components/WineLabelScanner.tsx` | MODIFIER | Exposer l'image scannee via callback |
| `src/components/CreateWineForPostDialog.tsx` | MODIFIER | Logique conditionnelle selon role + pre-remplir image |
| `src/components/AddWineToDomainDialog.tsx` | MODIFIER | Meme logique |
| `src/components/CreateWineInDomainDialog.tsx` | MODIFIER | Meme logique |

---

## Implementation Detaillee

### 1. Hook useUserRole.ts

Creer un hook qui verifie si l'utilisateur connecte a un role dans `user_roles` :

```typescript
// src/hooks/useUserRole.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useUserRole() {
  const { user } = useAuth();
  const [hasRole, setHasRole] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setHasRole(false);
      setRole(null);
      setLoading(false);
      return;
    }

    const checkRole = async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setHasRole(true);
        setRole(data.role);
      } else {
        setHasRole(false);
        setRole(null);
      }
      setLoading(false);
    };

    checkRole();
  }, [user]);

  return { hasRole, role, loading, canUseAI: hasRole };
}
```

---

### 2. Modification Edge Function scan-wine-label

L'edge function doit maintenant :
1. Extraire les donnees de l'etiquette (actuel)
2. Matcher le domaine avec `similarity()` (seuil 0.6)
3. Creer le domaine si pas de match + gerer la region
4. Matcher l'appellation avec `similarity()` (seuil 0.6)
5. Creer l'appellation si pas de match
6. Fallback : si wine_name est null, utiliser domain_name

**Nouveau prompt IA :**
- Demander explicitement les regions valides de l'enum
- Si region non trouvee, retourner "other" + custom_region

**Nouvelles donnees retournees :**
```typescript
interface ScanResult {
  // Donnees brutes de l'IA
  wine_name: string | null;
  domain_name: string | null;
  year: number | null;
  appellation_name: string | null;
  wine_type: 'rouge' | 'blanc' | 'rose' | 'effervescent' | 'autre' | null;
  alcohol_percentage: number | null;
  volume_ml: number | null;
  region: string | null;  // Nom de la region trouvee
  custom_region: string | null;  // Si hors enum
  confidence: number;
  
  // IDs resolus apres matching
  domain_id: string | null;  // UUID du domaine trouve/cree
  appellation_id: number | null;  // ID de l'appellation trouvee/creee
  domain_created: boolean;  // True si nouveau domaine cree
  appellation_created: boolean;  // True si nouvelle appellation creee
}
```

**Logique de matching domaine :**
```sql
-- Recherche par similarite (pg_trgm)
SELECT id, name, similarity(extensions.unaccent(lower(name)), extensions.unaccent(lower($domain_name))) as sim
FROM domain
WHERE similarity(extensions.unaccent(lower(name)), extensions.unaccent(lower($domain_name))) > 0.8
ORDER BY sim DESC
LIMIT 1;
```

Si aucun match :
- Creer le domaine avec les infos extraites
- Mapper la region vers l'enum `domain_region` ou utiliser "other" + custom_region

**Logique de matching appellation :**
```sql
SELECT id, nom, similarity(normalized_nom, $normalized_appellation) as sim
FROM appellation
WHERE similarity(normalized_nom, $normalized_appellation) > 0.8
ORDER BY sim DESC
LIMIT 1;
```

Si aucun match :
- Creer l'appellation avec le nom extrait

**Fallback wine_name :**
- Si `wine_name` est null et `domain_name` existe, utiliser `domain_name` comme `wine_name`

---

### 3. Modification WineLabelScanner.tsx

Ajouter une prop pour exposer l'image scannee :

```typescript
interface WineLabelScannerProps {
  onScanComplete: (data: WineLabelData, imageBase64: string | null) => void;
  disabled?: boolean;
  className?: string;
}
```

Quand le scan est termine, appeler `onScanComplete(result, imagePreview)`.

---

### 4. Modification CreateWineForPostDialog.tsx

**Changements majeurs :**

1. Importer `useUserRole()`
2. Afficher le scanner UNIQUEMENT si `canUseAI`
3. Masquer le bouton "Ajouter mon domaine" en mode scan
4. Pre-remplir l'image de l'etiquette avec la photo scannee
5. Utiliser les IDs resolus (domain_id, appellation_id) directement

**Logique conditionnelle :**
```typescript
const { canUseAI, loading: roleLoading } = useUserRole();
const [isAIMode, setIsAIMode] = useState(false);  // True quand un scan a ete fait

// Si pas de role : formulaire manuel complet (comme avant)
// Si role : afficher scanner, et apres scan, pre-remplir tout
```

**Pre-remplissage apres scan :**
```typescript
const handleScanComplete = (data: ScanResult, imageBase64: string | null) => {
  setIsAIMode(true);
  
  // Nom du vin (fallback sur domaine si null)
  setName(data.wine_name || data.domain_name || '');
  
  // Domaine deja resolu
  if (data.domain_id) {
    setSelectedDomain({ id: data.domain_id, name: data.domain_name });
  }
  
  // Appellation deja resolue
  if (data.appellation_id) {
    setAppellationId(data.appellation_id);
  }
  
  // Autres champs
  if (data.year) setYear(data.year.toString());
  if (data.volume_ml) setVolume(data.volume_ml.toString());
  if (data.wine_type) {
    const typeMap = { rouge: 1, blanc: 2, rose: 5, effervescent: 8, autre: 7 };
    setWineType(typeMap[data.wine_type] || 1);
  }
  
  // Pre-remplir l'image de l'etiquette
  if (imageBase64) {
    setLabelPreview(imageBase64);
    // Convertir base64 en File pour l'upload
    fetch(imageBase64)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], 'etiquette.jpg', { type: 'image/jpeg' });
        setLabelFile(file);
      });
  }
};
```

---

### 5. Gestion des Regions dans l'Edge Function

**Regions valides (enum domain_region) :**
- Champagne, Loire, Rhone, Alsace, Bourgogne, Bordeaux, Jura, Beaujolais, Languedoc-Roussillon, Sud-Ouest, Corse, Provence, unknown, other

**Prompt IA mis a jour :**
```text
Pour la region, choisis parmi les valeurs suivantes si possible :
Alsace, Beaujolais, Bordeaux, Bourgogne, Champagne, Corse, Jura, Languedoc-Roussillon, Loire, Provence, Rhone, Sud-Ouest

Si la region n'est pas dans cette liste, retourne :
- "region": "other"
- "custom_region": "nom de la region trouvee"
```

**Mapping dans l'Edge Function :**
```typescript
// Normaliser la region vers l'enum
const VALID_REGIONS = [
  'Alsace', 'Beaujolais', 'Bordeaux', 'Bourgogne', 'Champagne', 
  'Corse', 'Jura', 'Languedoc-Roussillon', 'Loire', 'Provence', 
  'Rhône', 'Sud-Ouest'
];

const normalizedRegion = VALID_REGIONS.find(
  r => r.toLowerCase() === extractedRegion?.toLowerCase()
);

if (normalizedRegion) {
  domainData.region = normalizedRegion;
  domainData.custom_region = null;
} else if (extractedRegion) {
  domainData.region = 'other';
  domainData.custom_region = extractedRegion;
} else {
  domainData.region = 'unknown';
  domainData.custom_region = null;
}
```

---

### 6. Interface Utilisateur Finale

**Utilisateur AVEC role (Premium) :**
1. Voit le scanner en haut du formulaire
2. Prend une photo
3. Tous les champs sont pre-remplis (domaine, vin, appellation, type, annee, volume)
4. L'image scannee est utilisee comme etiquette
5. Peut modifier les valeurs si besoin
6. Pas de bouton "Ajouter mon domaine" visible
7. Valide le formulaire

**Utilisateur SANS role (Standard) :**
1. Ne voit PAS le scanner
2. Formulaire manuel classique
3. Recherche domaine + bouton "Ajouter mon domaine" si non trouve
4. Selection appellation avec bouton "Creer une appellation" si non trouvee
5. Upload manuel de l'image

---

## Base de Donnees

Aucune migration necessaire. Les tables existantes suffisent :
- `user_roles` : verification du role
- `domain` : creation avec `region` et `custom_region`
- `appellation` : creation avec `normalized_nom`
- `wine` : creation avec les IDs resolus

L'extension `pg_trgm` est deja installee pour la fonction `similarity()`.

---

## Securite

- L'edge function verifie le JWT
- Les creations de domaines/appellations passent par RLS
- Seuls les utilisateurs authentifies peuvent creer

---

## Resume des Etapes

1. Creer `useUserRole.ts` pour detecter les utilisateurs premium
2. Modifier l'Edge Function pour :
   - Fallback wine_name sur domain_name
   - Matcher domaines avec similarity >= 0.8
   - Creer domaine si pas de match (avec region)
   - Matcher appellations avec similarity >= 0.8
   - Creer appellation si pas de match
   - Retourner les IDs resolus
3. Modifier `WineLabelScanner` pour exposer l'image base64
4. Modifier les dialogues de creation pour :
   - Verifier le role avec `useUserRole()`
   - Afficher scanner uniquement si premium
   - Pre-remplir l'image avec la photo scannee
   - Masquer "Ajouter mon domaine" en mode IA
   - Utiliser les IDs resolus directement

