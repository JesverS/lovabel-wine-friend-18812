

# Plan : Systeme de Cles d'Invitation Premium

## Resume

Ajout d'un systeme de codes d'invitation dans les parametres utilisateur. L'utilisateur entre un code, ce code lui attribue un role "premium" dans la table `user_roles`, ce qui debloque des fonctionnalites bonus (comme le scanner IA). Chaque cle a un quota d'utilisations, et on garde une trace de qui a utilise quelle cle.

---

## Architecture du Systeme

```text
FLUX UTILISATEUR

Parametres du compte
      |
      v
Onglet "Premium"  (nouveau)
      |
      v
Champ "Code d'invitation"
      |
      v
Edge Function: redeem-invite-key
      |
      +---> Verif: cle existe ?  ---> Non ---> Erreur "Code invalide"
      |
      +---> Verif: cle pas expiree ? ---> Expiree ---> Erreur "Code expire"
      |
      +---> Verif: quota restant ? ---> 0 ---> Erreur "Code epuise"
      |
      +---> Verif: user deja premium ? ---> Oui ---> Erreur "Deja actif"
      |
      +---> INSERT user_roles (user_id, role: 'premium')
      |
      +---> INSERT invite_key_usage (tracking)
      |
      +---> UPDATE invite_key (remaining_uses - 1)
      |
      v
Succes : "Fonctionnalites premium activees !"
```

---

## Partie 1 : Base de Donnees

### 1.1 Nouveau role dans l'enum `app_role`

Ajout de la valeur `'premium'` a l'enum existant :

```sql
ALTER TYPE public.app_role ADD VALUE 'premium';
```

### 1.2 Table `invite_key` (les codes d'invitation)

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique |
| code | text | Le code d'invitation (unique, ex: "WINENOTE2026") |
| description | text | Description interne (pour l'admin) |
| role_granted | app_role | Le role attribue (default: 'premium') |
| max_uses | integer | Nombre maximum d'utilisations |
| remaining_uses | integer | Utilisations restantes |
| expires_at | timestamptz | Date d'expiration (nullable) |
| is_active | boolean | Active/desactivee manuellement |
| created_by | uuid | L'admin qui a cree la cle |
| created_at | timestamptz | Date de creation |

**RLS :**
- SELECT : super_admin uniquement
- INSERT/UPDATE/DELETE : super_admin uniquement
- Pas d'acces direct par les utilisateurs normaux (tout passe par Edge Function)

### 1.3 Table `invite_key_usage` (tracking des utilisations)

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Identifiant unique |
| invite_key_id | uuid | Reference vers la cle utilisee |
| user_id | uuid | L'utilisateur qui a utilise la cle |
| redeemed_at | timestamptz | Date d'utilisation |

**RLS :**
- SELECT : l'utilisateur peut voir ses propres utilisations
- INSERT/UPDATE/DELETE : interdit (gere par Edge Function en service_role)

### 1.4 Resume SQL

```sql
-- Nouveau role
ALTER TYPE public.app_role ADD VALUE 'premium';

-- Table des cles
CREATE TABLE public.invite_key (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  role_granted app_role NOT NULL DEFAULT 'premium',
  max_uses integer NOT NULL DEFAULT 1,
  remaining_uses integer NOT NULL DEFAULT 1,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Table de tracking
CREATE TABLE public.invite_key_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_key_id uuid NOT NULL REFERENCES invite_key(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(invite_key_id, user_id)
);

-- RLS sur les deux tables
-- + Index sur invite_key.code pour recherche rapide
```

---

## Partie 2 : Edge Function `redeem-invite-key`

### Pourquoi une Edge Function ?

L'insertion dans `user_roles` est protegee par RLS (seuls les super_admin peuvent inserer). Donc un utilisateur normal ne peut pas s'ajouter un role directement. L'Edge Function utilise le `service_role` pour effectuer l'operation de maniere securisee apres validation.

### Logique de l'Edge Function

```text
1. Verifier le JWT (authentification)
2. Recevoir le code d'invitation
3. Valider le code :
   - Existe dans invite_key
   - is_active = true
   - remaining_uses > 0
   - expires_at est null OU dans le futur
4. Verifier que l'utilisateur n'a pas deja un role
5. Verifier que l'utilisateur n'a pas deja utilise CE code
6. En transaction :
   a. INSERT dans user_roles (user_id, role)
   b. INSERT dans invite_key_usage (tracking)
   c. UPDATE invite_key SET remaining_uses = remaining_uses - 1
7. Retourner succes avec le role attribue
```

### Codes d'erreur

| Code HTTP | Code | Message |
|-----------|------|---------|
| 400 | INVALID_CODE | Code d'invitation invalide |
| 400 | CODE_EXPIRED | Ce code a expire |
| 400 | CODE_EXHAUSTED | Ce code a atteint sa limite d'utilisation |
| 400 | ALREADY_PREMIUM | Vous avez deja un role actif |
| 400 | ALREADY_USED | Vous avez deja utilise ce code |

---

## Partie 3 : Frontend

### 3.1 Nouveau composant `InviteKeyRedemption`

**Fichier :** `src/components/InviteKeyRedemption.tsx`

Un composant simple avec :
- Un champ texte pour entrer le code
- Un bouton "Activer"
- Affichage du statut actuel (premium ou non)
- Messages de succes/erreur

```text
+------------------------------------------+
|  Fonctionnalites Premium                  |
|                                           |
|  [Badge: Premium actif]  (si deja actif) |
|  OU                                       |
|  Entrez un code d'invitation :            |
|  [____________] [Activer]                 |
|                                           |
|  Les fonctionnalites premium incluent :   |
|  - Scanner IA d'etiquettes de vin         |
|  - (futures fonctionnalites)              |
+------------------------------------------+
```

### 3.2 Integration dans les Parametres

**Fichier :** `src/pages/UserProfile.tsx`

Ajout d'un 4eme onglet "Premium" dans le dialog des parametres :

```text
[Confidentialite] [Compte Stripe] [Mes revenus] [Premium]
```

Le contenu de l'onglet affiche le composant `InviteKeyRedemption`.

### 3.3 Mise a jour du hook `useUserRole`

Apres activation reussie d'un code, le hook doit se rafraichir pour que l'UI reflète immediatement le nouveau role (ex: le scanner IA devient accessible sans recharger la page).

---

## Partie 4 : Securite

### Points cles

1. **L'utilisateur ne peut PAS modifier `user_roles` directement** - RLS bloque tout sauf super_admin
2. **L'Edge Function valide tout cote serveur** - impossible de tricher en appelant l'API directement sans code valide
3. **Chaque code a un quota** - impossible de partager un code sans limite
4. **Tracking complet** - on sait exactement qui a utilise quel code et quand
5. **Les codes peuvent etre desactives** - `is_active = false` pour revoquer un code

### Prevention des abus

- Contrainte `UNIQUE(invite_key_id, user_id)` : un user ne peut pas utiliser le meme code deux fois
- Contrainte `UNIQUE user_id` sur `user_roles` : un user n'a qu'un seul role
- Verification du role existant avant insertion

---

## Fichiers a Creer/Modifier

| Fichier | Action | Description |
|---------|--------|-------------|
| Migration SQL | CREER | Tables invite_key + invite_key_usage + enum premium |
| `supabase/functions/redeem-invite-key/index.ts` | CREER | Edge Function de validation et attribution |
| `src/components/InviteKeyRedemption.tsx` | CREER | Composant UI pour entrer le code |
| `src/pages/UserProfile.tsx` | MODIFIER | Ajouter onglet "Premium" dans parametres |
| `src/hooks/useUserRole.ts` | MODIFIER | Ajouter fonction refresh pour mise a jour immediate |

---

## Section Technique

### Impact sur le systeme existant

Le scanner IA (`scan-wine-label`) verifie deja si l'utilisateur a un role dans `user_roles`. Le role `premium` sera automatiquement detecte sans modification de l'Edge Function existante, car la verification est :

```typescript
// scan-wine-label/index.ts (existant)
const { data: userRole } = await supabaseAdmin
  .from('user_roles')
  .select('role')
  .eq('user_id', userId)
  .maybeSingle();

if (!userRole) { // Bloque si PAS de role
  return 403;
}
```

Donc tout utilisateur avec un role (premium, admin, super_admin) aura automatiquement acces au scanner. Aucun changement necessaire dans `scan-wine-label`.

### Limites du scan par role (mise a jour)

| Role | Scans/mois |
|------|------------|
| premium | 50 |
| admin | 200 |
| super_admin | Illimite |

Le `SCAN_LIMITS` dans `scan-wine-label` sera mis a jour pour inclure `'premium': 50`.

