
# Sécuriser l'endpoint push notification

## Approche simplifiée

Au lieu d'ajouter un nouveau secret `PUSH_FUNCTION_SECRET`, on utilise le `service_role_key` **déjà envoyé par le trigger SQL** dans le header `Authorization`. L'edge function a déjà accès à `SUPABASE_SERVICE_ROLE_KEY` via `Deno.env` — il suffit de comparer les deux.

**Avantage** : aucun secret à créer, aucune modification du trigger SQL, zéro risque de casser les notifications existantes.

## Modification unique

**Fichier** : `supabase/functions/send-push-notification/index.ts`

Ajouter en haut une fonction de vérification :
```typescript
function isServiceRole(req: Request): boolean {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  return !!serviceRoleKey && token === serviceRoleKey;
}
```

Puis au début du handler `Deno.serve`, après le check OPTIONS :
```typescript
if (!isServiceRole(req)) {
  return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
}
```

## Ce qui ne change PAS

- Le trigger SQL `trigger_send_push_notification` reste identique (il envoie déjà le service_role_key)
- `supabase/config.toml` reste à `verify_jwt = false` (nécessaire car pg_net n'envoie pas un JWT classique)
- Aucun impact sur l'app mobile ni sur le site web (ils n'appellent jamais cet endpoint)
- Aucun nouveau secret à configurer

## Résultat

Avant : `curl -d '{"user_id":"xxx","title":"Fake"}' .../send-push-notification` → notification envoyée
Après : même requête → `403 Forbidden`
