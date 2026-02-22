

# Correction du trigger push notification

## Probleme confirme par l'analyse de la base

Le trigger `trigger_push_on_notification_insert` est present et actif sur la table `notification`. Cependant, la fonction `trigger_send_push_notification()` appelle `extensions.http_post()` qui **n'existe pas** dans la base. La seule fonction `http_post` disponible est `net.http_post()` (extension `pg_net`).

A chaque insertion, l'appel echoue silencieusement grace au bloc `EXCEPTION WHEN OTHERS THEN RETURN NEW`.

## Correction a appliquer

Une seule migration SQL qui remplace la fonction trigger :

```sql
CREATE OR REPLACE FUNCTION public.trigger_send_push_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net'
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://amzutunyjouejovlrlah.supabase.co/functions/v1/send-push-notification',
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'title', NEW.title,
      'body', COALESCE(NEW.message, ''),
      'data', jsonb_build_object(
        'type', NEW.type,
        'notification_id', NEW.id,
        'extra', COALESCE(NEW.data, '{}'::jsonb)
      )
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(
        current_setting('supabase.service_role_key', true),
        ''
      )
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Push notification trigger failed: %', SQLERRM;
    RETURN NEW;
END;
$function$;
```

### Ce qui change par rapport a la version actuelle

- `extensions.http_post()` devient `net.http_post()` (la seule version qui existe)
- Le `body` est passe en `jsonb` directement (pas de cast `::text` -- `net.http_post` attend du `jsonb`)
- L'URL est en dur au lieu de dependre de `app.settings.supabase_url` (qui peut etre null)
- Le `search_path` inclut `net` pour la resolution du schema

### Rien d'autre ne change

- Le trigger lui-meme (`trigger_push_on_notification_insert`) reste en place tel quel
- L'Edge Function `send-push-notification` ne necessite aucune modification
- Le code frontend reste identique

### Apres la migration

Tester avec :

```sql
INSERT INTO notification (user_id, type, title, message, data)
VALUES ('VOTRE_USER_ID', 'test', 'Test push', 'Notification test', '{}'::jsonb);
```

Puis verifier les logs de l'Edge Function -- des logs doivent maintenant apparaitre.

