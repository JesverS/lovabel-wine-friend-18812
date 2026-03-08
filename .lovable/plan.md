

# Plan de correction — Bugs restants et ameliorations

## 1. CRITIQUE — Fix `.single()` restants

Remplacer `.single()` par `.maybeSingle()` dans les fichiers suivants, avec gestion gracieuse du cas `null` :

| Fichier | Ligne | Contexte |
|---------|-------|----------|
| `CellarDetails.tsx` | 80 | Cellar par slug — si slug invalide |
| `WineDetails.tsx` | 67 | Wine par ID |
| `WineDetails.tsx` | 77 | Domain par ID |
| `UserTastings.tsx` | 285 | Domain par ID (dans fetchTastingsByDomain) |
| `UserTastings.tsx` | 510 | Wine par ID (dans fetchAllTastings) |
| `UserTastings.tsx` | 518 | Domain par ID (dans fetchAllTastings) |
| `UserTastings.tsx` | 586 | Wine par ID (dans fetchTastingsByCellar) |
| `UserTastings.tsx` | 594 | Domain par ID (dans fetchTastingsByCellar) |
| `CellarInvitation.tsx` | 52 | Invitation par token |
| `EventInvitation.tsx` | 54 | Invitation par token |
| `CourseDetails.tsx` | 64 | Cours par ID |
| `CourseLocked.tsx` | 28 | Cours par ID |
| `Learning.tsx` | 68 | Profil user XP |
| `CellarMembers.tsx` | 37 | Profil user |
| `BlogArticle.tsx` | 28 | Article par slug |
| `EventDetails.tsx` | 585 | Event banner lors suppression |

Pour chacun : remplacer `.single()` par `.maybeSingle()`, et gerer le cas `data === null` (afficher un message "introuvable" ou retourner silencieusement selon le contexte).

---

## 2. HAUTE — Remplacer `window.location.reload()` par invalidation React Query

3 occurrences a corriger :

| Fichier | Ligne | Correction |
|---------|-------|------------|
| `Feed.tsx` | 44 | Passer un callback `onPostCreated` qui appelle `queryClient.invalidateQueries({ queryKey: ['social-feed'] })`. Importer `useQueryClient`. |
| `CourseDetails.tsx` | 129 | Apres `unlock_next_lesson`, invalider les queries `['lessons-with-status', id]` et `['weekly-slots']` au lieu de recharger. |
| `LeaveEventPaidSection.tsx` | 68 | Apres demande de remboursement, appeler un callback `onRefundRequested` passe en prop par `EventDetails`, qui refetch les donnees de l'evenement. |

---

## 3. HAUTE — Deplacer token Mapbox dans `.env`

**Fichier : `TastingsMap.tsx` ligne 10**

- Remplacer le token en dur par `import.meta.env.VITE_MAPBOX_TOKEN`
- Le token Mapbox est un token **public** (pk.*), donc il peut etre stocke dans le code client. Cependant, le deplacer dans `.env` permet de le changer sans modifier le code et evite qu'il soit indexe par des bots.
- Ajouter `VITE_MAPBOX_TOKEN=pk.eyJ1...` dans le fichier `.env` existant.
- Ajouter un guard : si le token est absent, afficher un message au lieu de crasher.

---

## 4. MOYENNE — Paralleliser requetes EventDetails

**Fichier : `EventDetails.tsx` lignes 203-291**

Les requetes user (role, access request, member status, payment, refund) sont actuellement sequentielles. Regrouper les requetes independantes avec `Promise.all` :

```text
const [userEventData, requestData, memberData, paymentData, completedPayment] = await Promise.all([
  supabase.from("user_event").select("role").eq(...).maybeSingle(),
  supabase.from("event_access_request").select(...).maybeSingle(),
  supabase.from("user_event").select("user_id").eq(...).maybeSingle(),
  supabase.from("event_payment").select(...).eq("status","pending").maybeSingle(),
  supabase.from("event_payment").select("amount").eq("status","completed").maybeSingle(),
]);
```

Note : la requete `refund_request` depend de `completedPayment`, donc elle reste sequentielle apres le `Promise.all`.

---

## 5. MOYENNE — Fix `phone_number` parseInt → string

**Fichier : `EditProfileDialog.tsx` ligne 165**

Le champ `phone_number` est de type `integer` dans la table `user_profiles` (confirme par les types Supabase). Deux options :

- **Option A (migration SQL)** : changer le type de la colonne `phone_number` de `integer` a `text`. C'est la correction propre car un numero de telephone n'est pas un nombre (zeros en tete, format +33). Necessite une migration.
- **Option B (sans migration)** : garder `parseInt` mais c'est une perte de donnees.

**Recommandation** : Option A. Migration SQL `ALTER TABLE user_profiles ALTER COLUMN phone_number TYPE text USING phone_number::text;`. Puis dans `EditProfileDialog.tsx`, remplacer `parseInt(validated.téléphone)` par `validated.téléphone.trim()` directement. Mettre a jour aussi la vue `user_profiles_public` si elle expose ce champ.

---

## Resume d'execution

| Etape | Fichiers modifies | Migration SQL |
|-------|-------------------|---------------|
| 1. Fix .single() | 10 fichiers | Non |
| 2. window.location.reload | 3 fichiers | Non |
| 3. Token Mapbox | TastingsMap.tsx + .env | Non |
| 4. Paralleliser EventDetails | EventDetails.tsx | Non |
| 5. phone_number → text | EditProfileDialog.tsx | Oui (ALTER COLUMN) |

