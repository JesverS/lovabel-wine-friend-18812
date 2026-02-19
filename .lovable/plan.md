

# Plan de correction du systeme de paiement

## Problemes identifies et corrections

### 1. Version Stripe incoherente dans `process-refund-request` (Bug)

`process-refund-request/index.ts` utilise `stripe@14.21.0` avec `apiVersion: "2023-10-16"` alors que toutes les autres fonctions utilisent `stripe@18.5.0` avec `apiVersion: "2025-08-27.basil"`. Cela peut provoquer des incompatibilites lors des appels API Stripe.

**Correction** : Mettre a jour l'import et l'apiVersion pour etre coherent.

**Fichier** : `supabase/functions/process-refund-request/index.ts` (lignes 3 et 31)

---

### 2. Fausse confirmation de paiement apres timeout (Bug UX)

`PaymentSuccess.tsx` affiche "Paiement reussi" apres 15 retries meme si le webhook n'a pas encore confirme. L'utilisateur croit avoir acces mais ce n'est pas garanti.

**Correction** : Apres le max de retries, afficher un etat intermediaire "Paiement en cours de traitement" avec un bouton "Verifier dans l'app" au lieu de forcer le succes.

**Fichier** : `src/pages/PaymentSuccess.tsx`

---

### 3. Notification manquante apres traitement de remboursement (Fonctionnalite manquante)

Quand l'organisateur approuve ou rejette un remboursement, le participant n'est pas notifie. Il doit revenir manuellement verifier.

**Correction** : Ajouter des appels `create_notification` dans `process-refund-request` pour informer le participant du resultat (approuve avec montant rembourse, ou rejete avec motif).

**Fichier** : `supabase/functions/process-refund-request/index.ts`

---

### 4. Pas de verification de la date de l'evenement (Faille logique)

Aucune fonction ne verifie si `start_date` est dans le futur avant d'accepter un paiement. Un utilisateur pourrait payer pour un evenement deja passe.

**Correction** : Ajouter une verification dans `create-event-checkout-session` et dans `reserve_event_spot` pour bloquer les paiements si l'evenement est passe.

**Fichiers** :
- `supabase/functions/create-event-checkout-session/index.ts`
- Optionnel : ajouter la verification dans la fonction SQL `reserve_event_spot` via migration

---

### 5. URL de success/cancel fragile dans EventPaymentButton (Amelioration)

L'utilisation de `window.location.href` avec ajout naif de `?payment=success` peut creer des URL invalides si des parametres existent deja.

**Correction** : Utiliser `URL` API pour construire proprement l'URL avec les parametres.

**Fichier** : `src/components/EventPaymentButton.tsx`

---

## Points non traites (risque faible)

| Point | Raison |
|-------|--------|
| RLS SELECT sur event_payment | A verifier en base, mais PaymentSuccess utilise aussi user_event comme fallback |
| cleanup-expired-payments sans auth | Risque negligeable, ne supprime que des records expires |

---

## Resume des fichiers

| Fichier | Action |
|---------|--------|
| `supabase/functions/process-refund-request/index.ts` | Mise a jour Stripe version + ajout notifications |
| `src/pages/PaymentSuccess.tsx` | Remplacer faux succes par etat intermediaire |
| `supabase/functions/create-event-checkout-session/index.ts` | Verifier que l'evenement n'est pas passe |
| `src/components/EventPaymentButton.tsx` | Construction URL propre |

