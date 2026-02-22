

# Correction du trigger de notifications push

## Probleme identifie

Le trigger `trigger_push_on_notification_insert` appelle `extensions.http_post()`, une fonction de l'extension PostgreSQL `http`. Or, **cette extension n'est pas installee** sur votre projet Supabase -- seule `pg_net` l'est.

Le trigger echoue donc a chaque insertion, mais l'erreur est avalee silencieusement par le bloc `EXCEPTION WHEN OTHERS THEN RETURN NEW`, ce qui fait que l'insertion dans `notification` reussit mais aucun appel HTTP n'est jamais envoye.

## Solution

Remplacer la fonction trigger pour utiliser `net.http_post()` de `pg_net` au lieu de `extensions.http_post()`.

## Details techniques

La migration SQL suivante sera appliquee :

```sql
CREATE OR REPLACE FUNCTION public.trigger_send_push_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'net', 'extensions'
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

### Changements cles

1. **`net.http_post()` remplace `extensions.http_post()`** -- utilise pg_net qui est bien installe
2. **Le parametre `body` est passe en `jsonb`** directement (pg_net l'accepte nativement, pas besoin de `::text`)
3. **L'URL est en dur** pour eviter la dependance a `app.settings.supabase_url` qui peut etre null
4. **Le `service_role_key`** est recupere via `current_setting('supabase.service_role_key', true)` qui est disponible nativement dans les triggers Supabase

### Verification apres correction

Apres la migration, vous pourrez tester avec :

```sql
INSERT INTO notification (user_id, type, title, message, data)
VALUES (
  'VOTRE_USER_ID',
  'test',
  'Test push',
  'Test notification push',
  '{}'::jsonb
);
```

Puis verifier les logs de l'Edge Function `send-push-notification` -- cette fois, des logs devraient apparaitre.

