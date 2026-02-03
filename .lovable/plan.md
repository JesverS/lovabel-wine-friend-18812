

# Plan Complet d'Amelioration du Scanner IA Premium

## Resume Executif

Ce plan couvre 4 axes d'amelioration identifies lors de l'audit :
1. **Securisation backend** - Verification du role cote serveur
2. **Quotas utilisateurs** - Limitation des scans par mois
3. **Optimisation des couts** - Compression des images
4. **Meilleure UX** - Messages d'erreur explicites

---

## Etat Actuel du Systeme

```text
ARCHITECTURE ACTUELLE

Frontend                         Backend
---------                        -------
useUserRole() ──check──> user_roles table
     │                           
     ▼                           
canUseAI = true?                 
     │                           
     ▼                           
WineLabelScanner                 
     │                           
     ▼                           
supabase.functions.invoke ──────> scan-wine-label (Edge Function)
                                       │
                                       ▼
                              Lovable AI Gateway (Gemini)
                                       │
                                       ▼
                              Matching domaine/appellation
                                       │
                                       ▼
                              Creation si non trouve
```

**Problemes identifies :**
- L'Edge Function ne verifie PAS le role → contournement possible
- Pas de tracking des scans → un utilisateur peut epuiser le quota
- Images non compressees → consommation tokens elevee
- Messages d'erreur 402/429 peu explicites

---

## Partie 1 : Securisation Backend

### Modification de l'Edge Function

**Fichier :** `supabase/functions/scan-wine-label/index.ts`

**Changement :** Ajouter verification du role apres authentification JWT

```typescript
// Après vérification du JWT (ligne ~123)
const userId = claimsData.claims.sub;

// NOUVEAU: Vérifier que l'utilisateur a un rôle premium
const { data: userRole, error: roleError } = await supabaseAdmin
  .from('user_roles')
  .select('role')
  .eq('user_id', userId)
  .maybeSingle();

if (roleError || !userRole) {
  console.log(`User ${userId} attempted scan without premium role`);
  return new Response(
    JSON.stringify({ 
      error: 'Fonctionnalité réservée aux membres premium',
      code: 'PREMIUM_REQUIRED'
    }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

console.log(`User ${userId} has role: ${userRole.role}`);
```

**Benefice :** Meme si quelqu'un appelle l'API directement, il sera bloque.

---

## Partie 2 : Quotas et Tracking des Scans

### 2.1 Nouvelle Table de Tracking

**Migration SQL :**

```sql
CREATE TABLE public.ai_scan_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_type text NOT NULL DEFAULT 'wine_label',
  scanned_at timestamptz NOT NULL DEFAULT now(),
  tokens_used integer,
  success boolean DEFAULT true,
  error_code text
);

-- Index pour requêtes par utilisateur et mois
CREATE INDEX idx_ai_scan_usage_user_month 
ON ai_scan_usage (user_id, date_trunc('month', scanned_at));

-- RLS : utilisateur peut voir ses propres scans
ALTER TABLE ai_scan_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scans" ON ai_scan_usage
  FOR SELECT USING (auth.uid() = user_id);

-- Fonction pour compter les scans du mois
CREATE OR REPLACE FUNCTION get_monthly_scan_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::integer
  FROM ai_scan_usage
  WHERE user_id = p_user_id
  AND scanned_at >= date_trunc('month', now())
  AND success = true;
$$;
```

### 2.2 Limites par Role

| Role | Scans/mois | Justification |
|------|------------|---------------|
| member | 50 | Utilisateur standard premium |
| admin | 200 | Administrateur |
| super_admin | Illimite | Pas de limite |

### 2.3 Integration dans l'Edge Function

```typescript
// Constantes de limites
const SCAN_LIMITS: Record<string, number> = {
  'member': 50,
  'admin': 200,
  'super_admin': 999999, // Illimité
};

// Après vérification du rôle
const monthlyLimit = SCAN_LIMITS[userRole.role] || 50;

// Vérifier le quota
const { data: usageData } = await supabaseAdmin.rpc(
  'get_monthly_scan_count',
  { p_user_id: userId }
);

const currentUsage = usageData || 0;

if (currentUsage >= monthlyLimit) {
  return new Response(
    JSON.stringify({ 
      error: `Limite mensuelle atteinte (${currentUsage}/${monthlyLimit} scans)`,
      code: 'QUOTA_EXCEEDED',
      usage: { current: currentUsage, limit: monthlyLimit }
    }),
    { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Après le scan réussi, enregistrer l'usage
await supabaseAdmin.from('ai_scan_usage').insert({
  user_id: userId,
  scan_type: 'wine_label',
  success: true,
  tokens_used: aiResponse.usage?.total_tokens || null,
});
```

---

## Partie 3 : Optimisation des Images

### 3.1 Compression Cote Client

**Fichier :** `src/components/WineLabelScanner.tsx`

**Nouvelle fonction de compression :**

```typescript
const compressImage = async (base64: string, maxWidth: number = 1024, quality: number = 0.8): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Redimensionner si trop large
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);

      // Convertir en JPEG compressé
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };
    img.src = base64;
  });
};
```

**Integration :**

```typescript
// Dans handleFileSelect, après lecture du fichier
const base64 = reader.result as string;
const compressedBase64 = await compressImage(base64, 1024, 0.75);
setImagePreview(compressedBase64);

// Envoyer l'image compressée
const result = await scanImage(compressedBase64);
```

**Impact estime :**
- Image originale : 2-5 MB → ~500-800 tokens
- Image compressee : 100-300 KB → ~200-400 tokens
- **Reduction : 40-50% des couts**

---

## Partie 4 : Amelioration des Messages d'Erreur

### 4.1 Codes d'Erreur Structures

**Fichier :** `src/hooks/useWineLabelScan.ts`

```typescript
interface ScanError {
  error: string;
  code?: 'PREMIUM_REQUIRED' | 'QUOTA_EXCEEDED' | 'RATE_LIMITED' | 'CREDITS_EXHAUSTED' | 'UNKNOWN';
  usage?: { current: number; limit: number };
}

// Dans le catch des erreurs
const handleError = (data: ScanError) => {
  switch (data.code) {
    case 'PREMIUM_REQUIRED':
      toast.error('Cette fonctionnalité est réservée aux membres premium');
      break;
    case 'QUOTA_EXCEEDED':
      toast.error(`Limite mensuelle atteinte (${data.usage?.current}/${data.usage?.limit} scans)`);
      break;
    case 'RATE_LIMITED':
      toast.warning('Trop de requêtes, veuillez patienter quelques secondes');
      break;
    case 'CREDITS_EXHAUSTED':
      toast.error('Service temporairement indisponible, réessayez plus tard');
      break;
    default:
      toast.error(data.error || 'Erreur lors du scan');
  }
};
```

### 4.2 Hook pour Afficher le Quota

**Nouveau fichier :** `src/hooks/useScanQuota.ts`

```typescript
export function useScanQuota() {
  const { user } = useAuth();
  const [quota, setQuota] = useState<{ current: number; limit: number } | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchQuota = async () => {
      const { data: usage } = await supabase.rpc('get_monthly_scan_count', {
        p_user_id: user.id
      });

      const { data: role } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      const limits: Record<string, number> = {
        member: 50,
        admin: 200,
        super_admin: 999999,
      };

      setQuota({
        current: usage || 0,
        limit: limits[role?.role || 'member'] || 50,
      });
    };

    fetchQuota();
  }, [user]);

  return quota;
}
```

### 4.3 Affichage dans l'UI

**Dans WineLabelScanner :**

```typescript
// Afficher le quota restant
{quota && (
  <p className="text-xs text-muted-foreground text-right">
    {quota.current}/{quota.limit} scans ce mois
  </p>
)}
```

---

## Fichiers a Modifier/Creer

| Fichier | Action | Description |
|---------|--------|-------------|
| `supabase/functions/scan-wine-label/index.ts` | MODIFIER | Ajouter verif role + tracking + quotas |
| `src/components/WineLabelScanner.tsx` | MODIFIER | Ajouter compression + affichage quota |
| `src/hooks/useWineLabelScan.ts` | MODIFIER | Gestion erreurs structurees |
| `src/hooks/useScanQuota.ts` | CREER | Hook pour recuperer quota restant |
| Migration SQL | CREER | Table `ai_scan_usage` + fonction RPC |

---

## Impact sur les Couts

### Avant optimisation

| Scenario | Cout/scan | 1000 scans/mois |
|----------|-----------|-----------------|
| Images originales | ~$0.002 | ~$2/mois |

### Apres optimisation

| Scenario | Cout/scan | 1000 scans/mois |
|----------|-----------|-----------------|
| Images compressees | ~$0.001 | ~$1/mois |
| Avec quotas (max 50/user × 20 users) | - | Plafonne a ~$1/mois |

**Budget recommande :** $5-10/mois pour couvrir les pics d'utilisation

---

## Resume des Etapes d'Implementation

1. **Etape 1 : Migration BDD**
   - Creer table `ai_scan_usage`
   - Creer fonction `get_monthly_scan_count`

2. **Etape 2 : Securiser Edge Function**
   - Verifier role `user_roles`
   - Tracker chaque scan
   - Appliquer limites mensuelles

3. **Etape 3 : Optimiser Frontend**
   - Compression images avant envoi
   - Affichage quota restant
   - Messages d'erreur explicites

4. **Etape 4 : Nouveau hook**
   - `useScanQuota` pour UI

---

## Section Technique

### Diagramme de Flux Final

```text
Utilisateur prend photo
         │
         ▼
   Compression image
   (1024px max, 75% qualité)
         │
         ▼
   useWineLabelScan.scanImage()
         │
         ▼
   Edge Function: scan-wine-label
         │
         ├──> Vérif JWT ──> 401 si invalide
         │
         ├──> Vérif role user_roles ──> 403 si pas premium
         │
         ├──> Vérif quota mensuel ──> 429 si dépassé
         │
         ├──> Appel Lovable AI (Gemini)
         │         │
         │         └──> 402 si crédits épuisés
         │         └──> 429 si rate limited
         │
         ├──> Matching domaine (similarity 0.8)
         │
         ├──> Matching appellation (similarity 0.8)
         │
         ├──> Création si non trouvé
         │
         ├──> INSERT ai_scan_usage (tracking)
         │
         └──> Retour JSON avec IDs résolus
         │
         ▼
   Pré-remplissage formulaire
   + Image comme étiquette
```

### Securite

- JWT verifie cote serveur
- Role verifie en base de donnees
- RLS sur `ai_scan_usage` (lecture propre)
- Service role pour insertions

### Points de Monitoring

- Nombre de scans/jour via `ai_scan_usage`
- Erreurs 402/429 dans les logs Edge Function
- Ratio succes/echec par utilisateur

