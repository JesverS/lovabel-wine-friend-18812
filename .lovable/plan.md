

# Plan de Correction - Redirection Post-Authentification

## Problème Identifié

Le gateway de paiement web (`/pay/:slug`) est **fonctionnel**, mais la redirection après connexion ne ramène **pas** l'utilisateur vers la page de paiement. Il est systématiquement redirigé vers l'accueil (`/`).

**Flux actuel (cassé)** :
```text
App Mobile → /pay/event-slug → "Connexion requise" 
→ /auth?redirect=/pay/event-slug → Connexion OK 
→ / (accueil) ← BUG : redirect ignoré
```

**Flux attendu (corrigé)** :
```text
App Mobile → /pay/event-slug → "Connexion requise" 
→ /auth?redirect=/pay/event-slug → Connexion OK 
→ /pay/event-slug ← Retour au paiement
```

---

## Modifications Requises

### 1. Modifier `src/pages/Auth.tsx`

Lire et utiliser le paramètre `?redirect=` après connexion réussie.

**Changements :**

- Dans `onAuthStateChange` (event SIGNED_IN) : 
  - Si profil complet → rediriger vers `redirect` ou `/`
  - Si profil incomplet → stocker `redirect` en sessionStorage, puis `/complete-profile`

- Dans `handleAuth` (connexion email/password) :
  - Même logique de redirection

**Code à ajouter :**
```typescript
// En haut du composant
const [searchParams] = useSearchParams();
const redirectUrl = searchParams.get("redirect");

// Dans onAuthStateChange, après vérification profil
if (!profile || !profile.full_name || !profile.last_name || !profile.city) {
  if (redirectUrl) {
    sessionStorage.setItem("post_profile_redirect", redirectUrl);
  }
  navigate("/complete-profile");
} else {
  navigate(redirectUrl || "/");
}

// Idem dans handleAuth pour login email/password
```

### 2. Modifier `src/pages/CompleteProfile.tsx`

Récupérer la redirection stockée après complétion du profil.

**Changements :**

Dans `handleSubmit`, après succès :
```typescript
// Récupérer la redirection stockée
const postProfileRedirect = sessionStorage.getItem("post_profile_redirect");
if (postProfileRedirect) {
  sessionStorage.removeItem("post_profile_redirect");
  navigate(postProfileRedirect);
} else {
  navigate(`/user/${slug}`);
}
```

### 3. Sécuriser la redirection

Pour éviter les redirections malveillantes (open redirect), valider que l'URL commence par `/` :

```typescript
const isValidRedirect = (url: string | null): boolean => {
  if (!url) return false;
  // Autoriser uniquement les chemins relatifs internes
  return url.startsWith("/") && !url.startsWith("//");
};

const safeRedirect = isValidRedirect(redirectUrl) ? redirectUrl : "/";
```

---

## Récapitulatif des Fichiers à Modifier

| Fichier | Action |
|---------|--------|
| `src/pages/Auth.tsx` | Lire `?redirect=`, rediriger après connexion |
| `src/pages/CompleteProfile.tsx` | Récupérer redirection depuis sessionStorage |

---

## Système de Paiement - État Global

| Composant | État |
|-----------|------|
| Gateway `/pay/:slug` | ✅ Fonctionnel |
| Checkout Stripe | ✅ Fonctionnel |
| Webhook confirmation | ✅ Fonctionnel |
| Deep link retour app | ✅ Fonctionnel |
| Remboursements | ✅ Fonctionnel |
| Paiements en attente | ✅ Fonctionnel |
| **Redirection post-auth** | ❌ À corriger |

---

## Tests Post-Correction

1. Aller sur `/pay/event-slug` sans être connecté
2. Cliquer sur "Se connecter" → redirigé vers `/auth?redirect=/pay/event-slug`
3. Se connecter (profil complet) → doit revenir sur `/pay/event-slug`
4. Se connecter (profil incomplet) → `/complete-profile` → après soumission → `/pay/event-slug`
5. Tester avec OAuth Google/Apple → même comportement attendu

