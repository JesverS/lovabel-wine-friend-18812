

# Audit Stripe — Analyse complete de l'integration

## Resultat global : L'integration est solide et fonctionnelle

Apres analyse de **14 Edge Functions Stripe**, **6 composants frontend**, **3 pages de gateway**, et de la configuration des secrets, le systeme de paiement est bien concu et couvre tous les cas critiques. Voici le detail :

---

## Points forts (aucune correction necessaire)

1. **Flux checkout** : `create-event-checkout-session` est robuste — verification d'evenement passe, atomicite via `reserve_event_spot` RPC avec `FOR UPDATE` lock, gestion des sessions Stripe existantes, cleanup automatique.
2. **Webhook** : Idempotence correcte (verification `existingPayment?.status === 'completed'`), gestion des sessions expirees.
3. **Remboursements** : Double flux (organisateur direct via `refund-event-payment` + demande participant via `request-event-refund` / `process-refund-request`), `reverse_transfer: true` pour Stripe Connect.
4. **Stripe Connect** : Onboarding, status check, login link, payout — tout est en place.
5. **Pending payments** : Recovery banner avec countdown, annulation, cleanup CRON.
6. **Secrets** : `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET` sont configures.
7. **Version Stripe** : Standardisee sur `18.5.0` avec API `2025-08-27.basil` partout.
8. **PLATFORM_FEE_PERCENT** : Coherent a 10% dans tous les fichiers (checkout, refund, request-refund, leave-without-refund, refundUtils.ts).

---

## Problemes identifies

### BUG 1 — CORS headers incomplets sur toutes les Edge Functions Stripe (CRITIQUE)

**Toutes les fonctions Stripe** utilisent des CORS headers minimalistes :
```
"authorization, x-client-info, apikey, content-type"
```

La specification Supabase requiert aussi :
```
x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version
```

**Impact** : Certains clients (notamment mobiles ou versions recentes du SDK Supabase) envoient ces headers supplementaires. Sans eux dans `Access-Control-Allow-Headers`, le preflight CORS echoue et le paiement est bloque.

**Fichiers concernes** (10 fonctions) :
- `create-event-checkout-session/index.ts`
- `stripe-event-webhook/index.ts` (moins critique car appele par Stripe, pas le browser)
- `get-pending-payment/index.ts`
- `cancel-pending-payment/index.ts`
- `setup-stripe-connect-account/index.ts`
- `get-stripe-account-status/index.ts`
- `create-stripe-login-link/index.ts`
- `request-stripe-payout/index.ts`
- `leave-event/index.ts`
- `leave-event-without-refund/index.ts`
- `request-event-refund/index.ts`
- `process-refund-request/index.ts`

**Correction** : Mettre a jour les `corsHeaders` pour inclure les headers requis. Les 3 fonctions qui importent `_shared/cors.ts` (`refund-event-payment`, `get-event-revenue`, `get-organizer-revenue`, `cleanup-expired-payments`) doivent aussi etre verifiees.

### BUG 2 — `_shared/cors.ts` aussi incomplet

Le fichier partage `supabase/functions/_shared/cors.ts` utilise les memes headers incomplets. Il faut le corriger une seule fois pour toutes les fonctions qui l'importent.

### BUG 3 — `.single()` dans les Edge Functions Stripe (MOYEN)

Plusieurs `.single()` dans les fonctions Stripe pourraient crasher au lieu de retourner une erreur propre :

| Fonction | Contexte | Risque |
|----------|----------|--------|
| `create-event-checkout-session` L112 | `existingMember` check | Crash si doublon dans `user_event` |
| `create-event-checkout-session` L129 | `pendingPayment` check | Crash si plusieurs pending |
| `setup-stripe-connect-account` L65 | `existingAccount` | Crash si doublon |
| `setup-stripe-connect-account` L72 | `userProfile` slug | Crash si profil absent |
| `get-stripe-account-status` L57 | Compte Stripe | Gere (retourne `hasAccount: false`) |
| `refund-event-payment` L64, L97 | Paiement et role | Crash si doublon |
| `process-refund-request` L76, L98 | Requete et role | Crash si doublon |
| `get-event-revenue` L54 | Role user | Crash si doublon |
| `get-organizer-revenue` (aucun) | OK | — |

### BUG 4 — PaymentGateway.tsx `.single()` ligne 104 (MOYEN)

```typescript
const { data: membership } = await supabase
  .from("user_event")
  .select("user_id")
  .eq("event_id", eventData.id)
  .eq("user_id", user.id)
  .single();  // <-- devrait etre .maybeSingle()
```

Risque de crash PGRST116 si l'utilisateur n'est pas membre.

### OBSERVATION 5 — `refund-event-payment` utilise `supabaseServiceKey` pour l'auth (FAIBLE)

Ligne 30 : le client d'authentification est cree avec `supabaseServiceKey` au lieu de `SUPABASE_ANON_KEY`. Cela fonctionne mais est moins correct semantiquement — l'auth client devrait utiliser la cle anon.

### OBSERVATION 6 — `get-event-revenue` et `get-organizer-revenue` n'ont pas de limite sur les paiements

Les requetes `event_payment` n'ont pas de `.limit()`. Si un evenement a plus de 1000 paiements (limite par defaut Supabase), les totaux seraient faux. Pour le moment ce n'est pas un risque reel mais a surveiller.

---

## Plan de correction

### Etape 1 — Corriger les CORS headers (10 fichiers + 1 shared)

Mettre a jour `supabase/functions/_shared/cors.ts` et les 10 fonctions Stripe qui definissent leurs propres `corsHeaders` pour inclure les headers Supabase complets.

### Etape 2 — Remplacer `.single()` par `.maybeSingle()` dans les Edge Functions Stripe

Corriger les 8 appels `.single()` critiques dans les fonctions Stripe (checkout, setup, refund, process-refund, get-event-revenue).

### Etape 3 — Corriger PaymentGateway.tsx `.single()` ligne 104

Remplacer par `.maybeSingle()`.

---

## Resume

| Probleme | Severite | Action |
|----------|----------|--------|
| CORS headers incomplets (12 fonctions) | CRITIQUE | Corriger tous les headers |
| `.single()` dans Edge Functions Stripe | MOYEN | 8 corrections |
| `.single()` dans PaymentGateway.tsx | MOYEN | 1 correction |
| Limite 1000 rows sur revenue | FAIBLE | A surveiller (pas de correctif pour l'instant) |

Le systeme Stripe est **fonctionnellement complet et bien securise**. Les bugs identifies sont des problemes de robustesse (crashs sur cas limites) et de compatibilite CORS, pas des failles de logique metier.

