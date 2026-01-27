
# Analyse Approfondie - Bugs Potentiels et Problemes Identifies

## 1. Bugs Critiques

### 1.1 Utilisation de `.single()` Sans Gestion d'Erreur
**Fichiers affectes** : 35 fichiers, 295 occurrences

**Probleme** : L'utilisation de `.single()` provoque une erreur fatale (PGRST116) si aucun resultat n'est trouve. Plusieurs endroits utilisent `.single()` pour des donnees qui peuvent ne pas exister.

**Exemples a risque** :
```typescript
// src/pages/UserProfile.tsx ligne 111-112
const { data: followCounts } = await supabase
  .from('user_follow_counts')
  .select('followers_count, following_count')
  .eq('user_id', userId)
  .single(); // PROBLEME : nouveau user = pas de ligne
```

**Fichiers concernes prioritaires** :
- `src/pages/UserProfile.tsx` (ligne 112) - user_follow_counts peut ne pas exister
- `src/pages/PaymentSuccess.tsx` (lignes 48, 63) - verification membership/payment
- `src/components/FollowDialogs.tsx` - requetes de profils

**Solution** : Remplacer `.single()` par `.maybeSingle()` pour les donnees optionnelles.

---

### 1.2 Race Condition dans PaymentSuccess
**Fichier** : `src/pages/PaymentSuccess.tsx`

**Probleme** : La fonction `verifyPayment` peut etre appellee recursivement indefiniment si le webhook Stripe est lent a confirmer le paiement.

```typescript
// Ligne 68-70
if (payment?.status === "pending") {
  setState("pending");
  setTimeout(verifyPayment, 2000); // Recursion sans limite !
}
```

**Impact** : Boucle infinie potentielle, surcharge serveur, mauvaise UX.

**Solution** : Ajouter un compteur de tentatives maximum (ex: 15 tentatives = 30 secondes).

---

### 1.3 OAuth Redirect Perd le Parametre Redirect
**Fichier** : `src/pages/Auth.tsx` (lignes 83-84, 100)

**Probleme** : Les redirections OAuth (Google/Apple) ne conservent pas le parametre `?redirect=`.

```typescript
const { error } = await supabase.auth.signInWithOAuth({
  provider: "google",
  options: {
    redirectTo: `${window.location.origin}/auth`, // ← Perd ?redirect=/pay/slug
  },
});
```

**Impact** : Un utilisateur venant de `/pay/slug` via OAuth sera redirige vers `/` au lieu de `/pay/slug` apres connexion.

**Solution** : Stocker le `redirectUrl` dans `sessionStorage` AVANT l'appel OAuth, puis le recuperer au retour.

---

### 1.4 Etat `processing` Non Reset en Cas d'Erreur
**Fichier** : `src/pages/PaymentGateway.tsx` (ligne 173)

**Probleme** :
```typescript
} catch (err) {
  console.error("Payment error:", err);
  toast.error("Une erreur est survenue");
  setPageState("processing"); // ← Devrait etre "ready" !
}
```

**Impact** : L'utilisateur reste bloque sur "Redirection vers Stripe..." apres une erreur.

**Solution** : Changer en `setPageState("ready")`.

---

## 2. Bugs Moderes

### 2.1 Hashtag Usage Count Non Atomique
**Fichier** : `src/components/CreatePost.tsx` (lignes 200-222)

**Probleme** : Le compteur d'utilisation des hashtags est incremente via une lecture puis une ecriture separee, ce qui peut causer des pertes de comptage en cas de creations simultanees.

```typescript
// Lecture
const { data: existingHashtag } = await supabase
  .from('hashtag')
  .select('id')
  .eq('tag', tag)
  .maybeSingle();

if (existingHashtag) {
  // Ecriture separee - race condition possible
  await supabase
    .from('hashtag')
    .update({ usage_count: (existingHashtag as any).usage_count + 1 })
    .eq('id', hashtagId);
}
```

**Solution** : Utiliser une fonction RPC avec `UPDATE ... SET usage_count = usage_count + 1` atomique.

---

### 2.2 Fuites de Memoire Potentielles dans usePendingPayment
**Fichier** : `src/hooks/usePendingPayment.ts`

**Probleme** : L'intervalle du countdown peut continuer a tourner meme si le composant est demonte.

**Verification** : Le code semble correct avec `clearInterval` dans le cleanup. OK.

---

### 2.3 Token Prive Non Preserve dans Deep Links
**Fichier** : `src/pages/PaymentGateway.tsx` (ligne 313)

**Probleme** :
```typescript
<Button 
  onClick={() => window.location.href = `winenote://event/${slug}`}
  // ← Manque le token pour les evenements prives
>
```

**Impact** : Les utilisateurs d'evenements prives payes ne peuvent pas rouvrir l'app avec le bon token.

**Solution** : Recuperer et inclure le token prive dans le deep link.

---

## 3. Ameliorations de Securite

### 3.1 Validation Zod Non Appliquee Partout
**Edge Functions sans validation Zod active** :
- `send-event-invitation` - Schema existe mais non utilise
- `request-event-access` - Schema existe mais non utilise
- `request-event-refund` - Schema existe mais non utilise
- `create-cellar` - Schema existe mais non utilise

**Recommandation** : Uniformiser l'utilisation de `validateInput()` dans toutes les fonctions.

---

### 3.2 Logging Sensible en Production
**Fichier** : `src/pages/Auth.tsx` (ligne 44)

```typescript
console.log("Auth event:", event);
```

**Recommandation** : Utiliser le logger centralise (`src/lib/logger.ts`) qui desactive les logs en production.

---

## 4. Problemes de Performance

### 4.1 Requetes N+1 dans useSocialFeed
**Fichier** : `src/hooks/useSocialFeed.ts`

**Probleme** : Les fonctions `fetchFriendsPosts` et `fetchDiscoveryPosts` font des requetes separees, puis `enrichPosts` fait 3 requetes supplementaires.

**Impact** : 5+ requetes par page de feed.

**Recommandation** : Considerer une vue materialisee ou une fonction RPC optimisee.

---

### 4.2 Double Fetch de Profil
**Fichier** : `src/pages/CompleteProfile.tsx` (lignes 54, 59)

```typescript
const { data: { user: currentUser } } = await supabase.auth.getUser();
// Puis
const { data: profile } = await supabase.from("user_profiles").select("*").eq("id", user.id).maybeSingle();
```

**Impact mineur** : 2 requetes au lieu d'une possible optimisation.

---

## 5. Resume des Corrections Prioritaires

| Priorite | Bug | Fichier | Action |
|----------|-----|---------|--------|
| CRITIQUE | OAuth perd redirect | Auth.tsx | Stocker redirect dans sessionStorage avant OAuth |
| CRITIQUE | PageState "processing" non reset | PaymentGateway.tsx | Corriger catch block |
| HAUTE | `.single()` sans maybeSingle | UserProfile.tsx | Utiliser maybeSingle pour user_follow_counts |
| HAUTE | Boucle infinie verification paiement | PaymentSuccess.tsx | Limiter retries |
| MOYENNE | Token prive manquant dans deep link | PaymentGateway.tsx | Ajouter token au deep link |
| BASSE | Hashtag race condition | CreatePost.tsx | Utiliser RPC atomique |

---

## 6. Actions Recommandees

**Corrections immediates** (4 fichiers a modifier) :
1. `src/pages/Auth.tsx` - Conserver redirect OAuth via sessionStorage
2. `src/pages/PaymentGateway.tsx` - Fix catch block + token dans deep link
3. `src/pages/PaymentSuccess.tsx` - Limiter retries a 15 tentatives
4. `src/pages/UserProfile.tsx` - Remplacer .single() par .maybeSingle() pour follow_counts

**Consolidation (optionnel)** :
- Appliquer validation Zod dans toutes les Edge Functions
- Migrer les console.log vers le logger centralise
