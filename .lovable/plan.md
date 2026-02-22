

# Correction du trigger push notification + guide Firebase

## Probleme 1 : Migration non appliquee

Le trigger `trigger_send_push_notification()` utilise toujours `extensions.http_post()` qui n'est pas installe. La migration approuvee precedemment n'a pas ete executee.

### Action requise

Appliquer la migration SQL suivante pour remplacer la fonction trigger :

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

- `net.http_post()` remplace `extensions.http_post()` (pg_net est installe, http ne l'est pas)
- Le body est passe en `jsonb` directement (pg_net l'accepte nativement)
- L'URL est en dur pour eviter la dependance a `app.settings.supabase_url`
- Le `service_role_key` est recupere via `current_setting('supabase.service_role_key', true)`

## Probleme 2 : Format du secret FIREBASE_SERVICE_ACCOUNT_KEY

Le secret doit etre le contenu brut du fichier JSON telecharge depuis Firebase Console :

1. Firebase Console -> Parametres du projet -> Comptes de service -> Generer une nouvelle cle privee
2. Copier le contenu entier du fichier JSON telecharge
3. Le coller tel quel dans Supabase -> Settings -> Edge Functions -> Secrets sous le nom `FIREBASE_SERVICE_ACCOUNT_KEY`

### Regles importantes

- La valeur doit commencer par `{` et finir par `}`
- Les `\n` dans le champ `private_key` doivent etre conserves (le code les retire avant decodage)
- Les marqueurs `-----BEGIN PRIVATE KEY-----` et `-----END PRIVATE KEY-----` doivent etre presents
- Coller tout en une seule ligne continue (pas de retours a la ligne reels dans le champ du secret)

## Verification apres les deux corrections

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

Puis verifier les logs de l'Edge Function `send-push-notification` pour confirmer que l'appel est bien recu et traite.

