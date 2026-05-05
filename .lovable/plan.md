
# Plan de correction securite

## 1. Stockage cellar - Supprimer les 3 policies trop permissives

**Probleme** : 3 policies sur `storage.objects` ne verifient que `bucket_id = 'cellar'` sans verification de propriete. Elles sont en doublon avec les policies "Membres caves" qui elles font bien la jointure `user_cellar`.

**Verification** : Il existe deja 3 policies correctes qui joignent `user_cellar` :
- `Membres caves peuvent uploader images` (INSERT)
- `Membres caves peuvent modifier images` (UPDATE)
- `Membres caves peuvent supprimer images` (DELETE)
- `Fichiers cellar publiquement lisibles` / `Images de caves publiquement lisibles` (SELECT) - reste en place

**Action** : Migration SQL pour supprimer les 3 policies permissives :
```sql
DROP POLICY "Utilisateurs peuvent uploader dans cellar" ON storage.objects;
DROP POLICY "Utilisateurs peuvent modifier leurs fichiers cellar" ON storage.objects;
DROP POLICY "Utilisateurs peuvent supprimer leurs fichiers cellar" ON storage.objects;
```

**Risque de casse** : Aucun. Les policies de remplacement existent deja et sont plus restrictives. La lecture reste publique.

---

## 2. Push notification endpoint - Ajouter un secret interne

**Probleme** : `send-push-notification` a `verify_jwt = false` et aucune verification interne. N'importe qui peut envoyer des notifications arbitraires.

**Contexte** : Cette fonction est appelee uniquement par le trigger SQL `trigger_send_push_notification` via `pg_net`. Le trigger envoie deja le `service_role_key` dans le header `Authorization`.

**Action** :
1. Ajouter un secret `PUSH_FUNCTION_SECRET` (valeur aleatoire)
2. Modifier le trigger SQL pour inclure ce secret dans un header `x-internal-secret`
3. Modifier la fonction edge pour verifier ce header au debut :
```typescript
const secret = req.headers.get('x-internal-secret');
if (secret !== Deno.env.get('PUSH_FUNCTION_SECRET')) {
  return new Response('Forbidden', { status: 403 });
}
```

**Risque de casse** : Aucun si le secret est ajoute AVANT le deploiement de la nouvelle version de la fonction. Le trigger est le seul appelant et il sera mis a jour en meme temps.

---

## 3. Table user_event - Analyse complete avant action

### Ce que j'ai verifie

**Requetes frontend directes a `user_event` :**
| Fichier | Filtre | Usage |
|---------|--------|-------|
| Events.tsx | `.eq('user_id', user.id)` | Mes evenements (propre user) |
| EventDetails.tsx | `.eq('user_id', user.id)` | Quitter un evenement (propre user) |
| UserProfile.tsx | `.eq('user_id', userId)` | Voir les events d'un autre profil |
| PaymentGateway.tsx | `.eq('user_id', user.id)` | Verifier sa propre inscription |
| PaymentGateway.tsx | `.eq('event_id', ...)` count | Compter tous les participants |
| PaymentSuccess.tsx | `.eq('user_id', user.id)` | Verifier sa propre inscription |
| EventAdministration.tsx | `.eq('event_id', ...)` | Lister TOUS les membres (admin) |

**Edge Functions (service_role, bypassent RLS)** : 15+ fonctions utilisent `user_event` via `supabaseAdmin` - pas impactees.

**RPC functions (SECURITY DEFINER, bypassent RLS)** : `user_has_event_access`, `user_participates_in_event`, `is_event_organizer`, `join_public_event`, `reserve_event_spot` - pas impactees.

### Conclusion sur user_event

Tu avais raison d'etre prudent. **Restreindre le SELECT casserait 3 cas :**
1. **UserProfile.tsx** : affiche les evenements d'un autre utilisateur (on query `.eq('user_id', userId)` pour un profil visite)
2. **PaymentGateway.tsx** : compte tous les participants d'un event pour verifier si complet
3. **EventAdministration.tsx** : liste tous les membres pour l'admin panel

**La table `user_event` ne contient aucune donnee sensible** (juste `user_id`, `event_id`, `role`, `access_origin`, `granted_by`, `created_at`). L'exposition est qu'un utilisateur authentifie peut enumerer les participants de tous les evenements, y compris prives.

### Action recommandee pour user_event

**Option retenue : ne PAS toucher la policy SELECT pour l'instant.** La table ne contient pas de PII, et les 3 cas d'usage frontend dependent de la lecture ouverte. Restreindre necessiterait de refactorer UserProfile, PaymentGateway et EventAdministration pour passer par des RPC SECURITY DEFINER dediees - un travail consequent pour un risque faible.

Si tu veux quand meme restreindre a terme, il faudrait :
- Creer une RPC `get_event_members(event_id)` qui verifie l'acces
- Creer une RPC `count_event_participants(event_id)` publique
- Modifier UserProfile pour ne plus afficher les events des autres (ou passer par une vue)

---

## Resume des actions

| Action | Risque | Difficulte |
|--------|--------|------------|
| Supprimer 3 policies cellar storage | Aucun | Facile |
| Securiser push notification endpoint | Aucun | Facile |
| user_event SELECT policy | **Reporter** | Moyen-eleve |

## Details techniques

- 1 migration SQL (drop policies cellar + update trigger push)
- 1 secret a ajouter (`PUSH_FUNCTION_SECRET`)
- 1 modification edge function `send-push-notification`
- 0 modification frontend
