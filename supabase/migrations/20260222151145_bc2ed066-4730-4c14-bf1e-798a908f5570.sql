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