

# Optimisation du chargement des evenements

## Contexte

Le chargement d'un evenement implique ~8-10 requetes en cascade (1 edge function + 5-6 requetes frontend sequentielles). L'objectif est de tout regrouper dans l'edge function pour n'avoir qu'un seul aller-retour reseau.

## Securite

Deplacer `createClient(url, serviceRoleKey)` hors du handler est sans risque : c'est un client admin serveur. L'authentification utilisateur (`auth.getUser(token)`) reste dans le handler, executee a chaque requete.

## Changements

### 1. Edge Function `get-event-by-slug/index.ts`

**a) Deplacer `createClient` au niveau module** (hors du handler Deno.serve)

**b) Paralleliser les requetes internes** avec `Promise.all` :
- Groupe 1 : fetch event + getUser (en parallele)
- Groupe 2 (apres event trouve) : membership + domaines + vins + access_request + pending_payment + refund_request (en parallele)

**c) Enrichir la reponse JSON** avec les nouvelles donnees :

```text
{
  event: { ... },                    // existant
  hasHiddenContactInfo: boolean,     // existant
  hasHiddenAddress: boolean,         // existant
  // NOUVEAU :
  userRole: "organizer" | "co_organizer" | "participant" | null,
  hasAccess: boolean,
  hasAccessRequest: boolean,
  accessRequestStatus: "pending" | "approved" | "rejected" | null,
  hasPendingPayment: boolean,
  userPaymentAmount: number | null,
  hasPendingRefundRequest: boolean,
  domainsWithWines: [
    {
      domain: { id, name, logo_url, region, slug },
      wines: [ { id, name, year, label_url, ... } ]
    }
  ],
  publicPosts: [ ... ]              // existant (pour non-membres)
}
```

**d) Logique de collecte des donnees utilisateur** (seulement si authentifie) :
- `user_event` : role du user dans l'event
- `event_access_request` : statut de demande d'acces
- `event_payment` : paiement pending non expire
- `event_refund_request` : demande de remboursement pending

**e) Logique de collecte des domaines/vins** (pour tous les visiteurs ayant acces) :
- `event_domain` JOIN `domain` : domaines lies a l'event
- `event_domain_wine` JOIN `wine` : vins par domaine

### 2. Frontend `src/pages/EventDetails.tsx`

**Supprimer les requetes Supabase post-edge-function** :
- Supprimer le fetch `user_event` (role)
- Supprimer le fetch `event_access_request`
- Supprimer le fetch `event_member` (doublon)
- Supprimer le fetch `event_payment` (pending)
- Supprimer le fetch `event_refund_request`
- Supprimer les fetchs `event_domain` + `domain` + `event_domain_wine`

**Lire tout depuis la reponse de l'edge function** :
- `userRole` remplace le state `userRole`
- `hasAccess` remplace le calcul local
- `hasAccessRequest` / `accessRequestStatus` remplacent le fetch access_request
- `hasPendingPayment` / `userPaymentAmount` remplacent le fetch payment
- `hasPendingRefundRequest` remplace le fetch refund_request
- `domainsWithWines` remplace la cascade domain/wines

### 3. Ce qui ne change PAS

- La logique de masquage confidential (inchangee dans l'edge function)
- Les controles d'acces public/prive/token (inchanges)
- La verification d'authentification via `auth.getUser()` (reste dans le handler)
- Les mutations (join, leave, like, comment) restent des appels directs Supabase
- Le composant `EventPosts` qui fetch ses propres posts (sauf `publicPosts` pour non-membres)

## Resultat attendu

- **1 seul appel reseau** au lieu de 6-8 en cascade
- Temps de chargement divise par ~3-4x
- Meme niveau de securite exact

