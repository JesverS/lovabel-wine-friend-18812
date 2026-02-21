
-- Table pour stocker les tokens de notification push
CREATE TABLE public.push_notification_token (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_device_token UNIQUE (device_token),
  CONSTRAINT unique_user_device UNIQUE (user_id, device_token)
);

-- Index pour recherche rapide par user_id
CREATE INDEX idx_push_notification_token_user_id ON public.push_notification_token (user_id);

-- RLS
ALTER TABLE public.push_notification_token ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir leurs propres tokens
CREATE POLICY "Users can view their own tokens"
ON public.push_notification_token
FOR SELECT
USING (auth.uid() = user_id);

-- Les utilisateurs peuvent insérer leurs propres tokens
CREATE POLICY "Users can insert their own tokens"
ON public.push_notification_token
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Les utilisateurs peuvent mettre à jour leurs propres tokens
CREATE POLICY "Users can update their own tokens"
ON public.push_notification_token
FOR UPDATE
USING (auth.uid() = user_id);

-- Les utilisateurs peuvent supprimer leurs propres tokens
CREATE POLICY "Users can delete their own tokens"
ON public.push_notification_token
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.update_push_token_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_push_notification_token_updated_at
BEFORE UPDATE ON public.push_notification_token
FOR EACH ROW
EXECUTE FUNCTION public.update_push_token_updated_at();

-- Trigger pour envoyer une notification push à chaque INSERT dans notification
-- Utilise pg_net pour appeler l'Edge Function de manière asynchrone
CREATE OR REPLACE FUNCTION public.trigger_send_push_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_supabase_url text;
  v_service_role_key text;
BEGIN
  -- Récupérer les variables d'environnement
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_service_role_key := current_setting('app.settings.service_role_key', true);

  -- Vérifier que les settings sont disponibles
  IF v_supabase_url IS NULL OR v_service_role_key IS NULL THEN
    -- Fallback : utiliser les valeurs en dur pour ce projet
    v_supabase_url := 'https://amzutunyjouejovlrlah.supabase.co';
  END IF;

  -- Appeler l'Edge Function via pg_net
  PERFORM extensions.http_post(
    url := v_supabase_url || '/functions/v1/send-push-notification',
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'title', NEW.title,
      'body', COALESCE(NEW.message, ''),
      'data', jsonb_build_object(
        'type', NEW.type,
        'notification_id', NEW.id,
        'extra', COALESCE(NEW.data, '{}'::jsonb)
      )
    )::text,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(v_service_role_key, current_setting('supabase.service_role_key', true))
    )::jsonb
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Ne pas bloquer l'insertion de la notification si le push échoue
    RAISE WARNING 'Push notification failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_push_on_notification_insert
AFTER INSERT ON public.notification
FOR EACH ROW
EXECUTE FUNCTION public.trigger_send_push_notification();
