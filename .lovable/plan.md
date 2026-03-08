

# Plan de correction des bugs et problemes identifies

## Phase 1 — Corrections critiques (`.single()` → `.maybeSingle()`)

**Fichiers concernes :**

- **`src/pages/EventDetails.tsx`** — Lignes 209, 228, 240, 252, 263, 275, 287 : remplacer les 7 appels `.single()` par `.maybeSingle()`. Tous ces appels concernent des donnees conditionnelles (role utilisateur, demande d'acces, paiement, remboursement, membership).

- **`src/components/Header.tsx`** ligne 34 et **`src/components/MobileBottomNav.tsx`** ligne 27 : remplacer `.single()` par `.maybeSingle()` pour le fetch du slug utilisateur (crash pour les nouveaux users sans profil).

- **`src/pages/UserProfile.tsx`** ligne 77 : remplacer `.single()` par `.maybeSingle()` pour le profil par slug.

- **`src/components/EventAccessRequestsManagement.tsx`** ligne 55 : idem.

- **`src/components/WineDetailsDialog.tsx`** et **`src/components/WineInteractionDialog.tsx`** : verifier et corriger les `.single()` sur les domaines.

- **`src/pages/DomainDetails.tsx`** ligne 62 : idem.

---

## Phase 2 — Performance du feed social

**Fichier : `src/hooks/useSocialFeed.ts`**

- Limiter `seenPostIds` aux 200 derniers IDs maximum. Quand le tableau depasse ce seuil, tronquer les plus anciens. Le cursor `created_at` suffit deja a eviter les doublons chronologiques, donc le tableau sert uniquement de filet de securite.

```text
const MAX_SEEN = 200;
const newSeenPostIds = [...cursor.seenPostIds, ...allPosts.map(p => p.id)].slice(-MAX_SEEN);
```

---

## Phase 3 — Parallelisation des requetes UserProfile

**Fichier : `src/pages/UserProfile.tsx`**

Apres le fetch initial du profil (qui fournit `userId`), regrouper les requetes independantes dans un `Promise.all` :

```text
const [postsData, userCellars, followCounts, userEvents, followStatus] = await Promise.all([
  fetchPosts(userId),
  fetchCellars(userId),
  fetchFollowCounts(userId),
  fetchEvents(userId),
  fetchFollowStatus(userId),  // si applicable
]);
```

Le fetch `pendingRequestsCount` (propre profil uniquement) peut etre inclus conditionnellement.

---

## Phase 4 — Race condition hashtags

**Fichier : `src/components/CreatePost.tsx`** lignes 198-229

Remplacer la lecture + ecriture non-atomique par un appel RPC SQL atomique ou un upsert avec increment :

- **Option retenue** : creer une fonction SQL `increment_hashtag_usage(p_tag text)` qui fait un `INSERT ... ON CONFLICT (tag) DO UPDATE SET usage_count = hashtag.usage_count + 1 RETURNING id`. Cela rend l'operation atomique.
- Cote frontend, remplacer la logique existante par un seul appel `supabase.rpc('increment_hashtag_usage', { p_tag: tag })`.

**Migration SQL necessaire** pour creer cette fonction.

---

## Phase 5 — Cache du slug utilisateur

**Fichiers : `src/components/Header.tsx` et `src/components/MobileBottomNav.tsx`**

Extraire le fetch du slug dans un hook partage `useUserSlug()` qui utilise `useQuery` avec un `staleTime` de 5 minutes. Les deux composants consomment ce hook au lieu de refaire un fetch a chaque mount.

---

## Phase 6 — Utilisation de `errorHandler.ts`

Remplacer les `catch (error: any)` les plus critiques (dans les composants utilisateur-facing) par `getErrorMessage()` et `getUserFriendlyErrorMessage()` :

- `CreatePost.tsx` — soumission de post
- `PostCard.tsx` — like, commentaire, suppression
- `EventDetails.tsx` — chargement de l'evenement
- `UserProfile.tsx` — chargement du profil
- `EditProfileDialog.tsx` — mise a jour du profil

Cela ne couvre pas les 385 occurrences mais cible les chemins les plus visibles par les utilisateurs.

---

## Phase 7 — PostCard sans pre-chargement

**Fichier : `src/pages/UserProfile.tsx`**

Passer `preloadedData={true}` aux PostCard du profil en pre-chargeant les donnees (auteur, vin, like status) dans `fetchProfileData` via un `enrichPosts` similaire a celui de `useSocialFeed.ts`. Cela elimine le probleme N*4 requetes.

---

## Resume de l'ordre d'execution

| Etape | Impact | Fichiers |
|-------|--------|----------|
| Phase 1 | Elimine les crashs | 7+ fichiers |
| Phase 2 | Corrige degradation perf feed | useSocialFeed.ts |
| Phase 3 | Accelere page profil | UserProfile.tsx |
| Phase 4 | Corrige donnees incorrectes | CreatePost.tsx + migration SQL |
| Phase 5 | Elimine requetes inutiles | Header, MobileBottomNav, nouveau hook |
| Phase 6 | Messages d'erreur propres | 5 fichiers prioritaires |
| Phase 7 | Elimine N*4 requetes profil | UserProfile.tsx |

