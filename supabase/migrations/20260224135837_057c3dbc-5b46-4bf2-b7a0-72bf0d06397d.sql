
-- Créer la fonction updated_at si elle n'existe pas
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 1. Créer la table notification_preferences
CREATE TABLE public.notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_id uuid NULL REFERENCES public.push_notification_token(id) ON DELETE CASCADE,
  post_like boolean NOT NULL DEFAULT true,
  post_comment boolean NOT NULL DEFAULT true,
  mention boolean NOT NULL DEFAULT true,
  follow_request boolean NOT NULL DEFAULT true,
  new_follower boolean NOT NULL DEFAULT true,
  follow_accepted boolean NOT NULL DEFAULT true,
  event_join boolean NOT NULL DEFAULT true,
  event_access_request boolean NOT NULL DEFAULT true,
  event_invitation boolean NOT NULL DEFAULT true,
  cellar_invitation boolean NOT NULL DEFAULT true,
  refund_request boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token_id)
);

CREATE INDEX idx_notification_preferences_user_id ON public.notification_preferences(user_id);
CREATE INDEX idx_notification_preferences_token_id ON public.notification_preferences(token_id) WHERE token_id IS NOT NULL;

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.notification_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences"
  ON public.notification_preferences FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Modifier create_notification() pour checker les prefs globales
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text DEFAULT NULL,
  p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_notification_id uuid;
  v_pref_value boolean;
BEGIN
  IF p_user_id = auth.uid() THEN
    RETURN NULL;
  END IF;

  IF p_type IN ('post_like', 'post_comment', 'mention', 'follow_request', 
                'new_follower', 'follow_accepted', 'event_join', 
                'event_access_request', 'event_invitation', 
                'cellar_invitation', 'refund_request') THEN
    BEGIN
      EXECUTE format(
        'SELECT %I FROM public.notification_preferences WHERE user_id = $1 AND token_id IS NULL',
        p_type
      ) INTO v_pref_value USING p_user_id;
    EXCEPTION WHEN undefined_column THEN
      v_pref_value := NULL;
    END;

    IF v_pref_value IS NOT NULL AND v_pref_value = false THEN
      RETURN NULL;
    END IF;
  END IF;

  INSERT INTO notification (user_id, type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_data)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$function$;

-- 3. Modifier notify_mentioned_user() pour utiliser create_notification()
CREATE OR REPLACE FUNCTION public.notify_mentioned_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  author_name TEXT;
  v_author_id uuid;
BEGIN
  SELECT user_id INTO v_author_id FROM public.post WHERE id = NEW.post_id;
  
  SELECT full_name INTO author_name
  FROM public.user_profiles
  WHERE id = v_author_id;
  
  PERFORM public.create_notification(
    NEW.mentioned_user_id,
    'mention',
    'Vous avez été mentionné',
    COALESCE(author_name, 'Quelqu''un') || ' vous a mentionné dans un post',
    jsonb_build_object('post_id', NEW.post_id, 'mentioned_slug', NEW.mentioned_slug)
  );
  RETURN NEW;
END;
$function$;
