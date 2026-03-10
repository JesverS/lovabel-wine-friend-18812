

# Plan d'optimisation — Niveaux 1, 2 et 3

## Niveau 1 — Parallelisation des 2 derniers await sequentiels

### Fichier : `supabase/functions/get-event-by-slug/index.ts`

Actuellement, apres le groupe 2 de `Promise.all`, il y a 2 `await` sequentiels :
- **Ligne 148-157** : `event_refund_request` (lance seulement si `completedPaymentRes.data` existe)
- **Ligne 197-207** : `publicPosts` (lance seulement si `!hasConfidentialAccess`)

**Changement** : Integrer ces 2 requetes dans le groupe 2 existant :
- `refundRequestPromise` : lance inconditionnellement pour les users authentifies (cout negligeable si pas de resultat)
- `publicPostsPromise` : lance toujours, on ignorera le resultat si l'utilisateur est membre

Ajouter ces 2 promesses au `Promise.all` existant (lignes 111-125), puis supprimer les 2 sections sequentielles. L'edge function passe de **4 await a 2 await**.

---

## Niveau 2 — Skeleton UI pour EventDetails

### Fichier : `src/pages/EventDetails.tsx`

Remplacer le bloc loading (lignes 510-520) qui affiche "Chargement..." par un skeleton screen complet qui reproduit la structure de la page finale :

```text
[==== Banner placeholder (h-48 md:h-64) ====]

Container :
  [Breadcrumb skeleton]
  [Titre skeleton - h-8 w-2/3]
  [Date + Ville skeleton - 2 badges]
  [Description skeleton - 3 lignes]
  
  [Section "Domaines presents" skeleton]
    [Card domaine 1 - logo + nom]
    [Card domaine 2 - logo + nom]
```

Utiliser le composant `Skeleton` existant (`src/components/ui/skeleton.tsx`). Le Header et Footer restent affiches normalement pendant le chargement.

---

## Niveau 3 — Cache React Query avec stale-while-revalidate

### Fichier : `src/pages/EventDetails.tsx`

Migrer le fetch de l'edge function vers `useQuery` de `@tanstack/react-query` (deja installe) :

- **queryKey** : `['event', slug, privateToken]`
- **queryFn** : appel `supabase.functions.invoke('get-event-by-slug', { body: { slug, token } })`
- **staleTime** : `5 * 60 * 1000` (5 min) — pas de refetch si les donnees ont moins de 5 min
- **gcTime** : `30 * 60 * 1000` (30 min) — garde en cache meme apres unmount

Remplacer tous les `useState` individuels (event, domainsWithWines, userRole, hasAccess, etc.) par des valeurs derivees du `data` retourne par `useQuery`. Garder `refetchData` comme simple appel a `queryClient.invalidateQueries({ queryKey: ['event', slug] })`.

Le `useEffect` pour le payment status (lignes 231-261) reste inchange, mais appelle `refetch()` au lieu de `setHasAccess(true)`.

### Fichier : `src/pages/Events.tsx`

Ajouter un prefetch au hover sur les cartes event :

- Importer `useQueryClient` de `@tanstack/react-query`
- Sur le `<Link>` de chaque carte event (ligne 214), ajouter un `onMouseEnter` / `onTouchStart` qui appelle `queryClient.prefetchQuery` avec le meme queryKey et queryFn que EventDetails
- Extraire le slug et token depuis `eventUrl` pour construire le body

---

## Resume des fichiers modifies

| Fichier | Changement |
|---------|-----------|
| `supabase/functions/get-event-by-slug/index.ts` | Paralleliser refund + publicPosts dans le groupe 2 |
| `src/pages/EventDetails.tsx` | Skeleton UI + migration vers useQuery |
| `src/pages/Events.tsx` | Prefetch au hover sur les cartes |

