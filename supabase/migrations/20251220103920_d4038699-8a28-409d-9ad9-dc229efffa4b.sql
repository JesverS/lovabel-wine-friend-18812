-- Table de notifications
CREATE TABLE public.notification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  data jsonb DEFAULT '{}',
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Indexes pour performance
CREATE INDEX idx_notification_user_id ON public.notification(user_id);
CREATE INDEX idx_notification_user_read ON public.notification(user_id, read);
CREATE INDEX idx_notification_created_at ON public.notification(created_at DESC);

-- RLS Policies
ALTER TABLE public.notification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON public.notification FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notification FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.notification FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification;

-- Fonction helper pour créer des notifications
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text DEFAULT NULL,
  p_data jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  -- Ne pas créer de notification pour soi-même
  IF p_user_id = auth.uid() THEN
    RETURN NULL;
  END IF;

  INSERT INTO notification (user_id, type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_data)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Trigger pour les follows (demande et acceptation)
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_follower_name text;
  v_follower_slug text;
BEGIN
  SELECT full_name, slug INTO v_follower_name, v_follower_slug
  FROM user_profiles
  WHERE id = NEW.follower_id;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'pending' THEN
      PERFORM create_notification(
        NEW.following_id,
        'follow_request',
        'Nouvelle demande d''abonnement',
        COALESCE(v_follower_name, 'Un utilisateur') || ' souhaite vous suivre',
        jsonb_build_object('follower_id', NEW.follower_id, 'follower_slug', v_follower_slug)
      );
    ELSIF NEW.status = 'accepted' THEN
      PERFORM create_notification(
        NEW.following_id,
        'new_follower',
        'Nouvel abonné',
        COALESCE(v_follower_name, 'Un utilisateur') || ' vous suit maintenant',
        jsonb_build_object('follower_id', NEW.follower_id, 'follower_slug', v_follower_slug)
      );
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
      PERFORM create_notification(
        NEW.follower_id,
        'follow_accepted',
        'Demande acceptée',
        'Votre demande d''abonnement a été acceptée',
        jsonb_build_object('following_id', NEW.following_id)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_on_follow
AFTER INSERT OR UPDATE ON public.user_follow
FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();

-- Trigger pour les likes de posts
CREATE OR REPLACE FUNCTION public.notify_on_post_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_author_id uuid;
  v_liker_name text;
  v_liker_slug text;
BEGIN
  SELECT user_id INTO v_post_author_id FROM post WHERE id = NEW.post_id;
  
  IF v_post_author_id IS NULL OR v_post_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT full_name, slug INTO v_liker_name, v_liker_slug
  FROM user_profiles WHERE id = NEW.user_id;

  PERFORM create_notification(
    v_post_author_id,
    'post_like',
    'Nouveau like',
    COALESCE(v_liker_name, 'Un utilisateur') || ' a aimé votre post',
    jsonb_build_object('post_id', NEW.post_id, 'user_id', NEW.user_id, 'user_slug', v_liker_slug)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_on_post_like
AFTER INSERT ON public.post_like
FOR EACH ROW EXECUTE FUNCTION public.notify_on_post_like();

-- Trigger pour les commentaires de posts
CREATE OR REPLACE FUNCTION public.notify_on_post_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_author_id uuid;
  v_commenter_name text;
  v_commenter_slug text;
BEGIN
  SELECT user_id INTO v_post_author_id FROM post WHERE id = NEW.post_id;
  
  IF v_post_author_id IS NULL OR v_post_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT full_name, slug INTO v_commenter_name, v_commenter_slug
  FROM user_profiles WHERE id = NEW.user_id;

  PERFORM create_notification(
    v_post_author_id,
    'post_comment',
    'Nouveau commentaire',
    COALESCE(v_commenter_name, 'Un utilisateur') || ' a commenté votre post',
    jsonb_build_object('post_id', NEW.post_id, 'comment_id', NEW.id, 'user_id', NEW.user_id, 'user_slug', v_commenter_slug)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_on_post_comment
AFTER INSERT ON public.post_comment
FOR EACH ROW EXECUTE FUNCTION public.notify_on_post_comment();

-- Trigger pour nouveau participant à un événement
CREATE OR REPLACE FUNCTION public.notify_on_event_join()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_organizer_id uuid;
  v_event_name text;
  v_event_slug text;
  v_participant_name text;
  v_participant_slug text;
BEGIN
  IF NEW.role != 'participant' THEN
    RETURN NEW;
  END IF;

  SELECT organizer_id, name, slug INTO v_organizer_id, v_event_name, v_event_slug
  FROM event WHERE id = NEW.event_id;
  
  IF v_organizer_id IS NULL OR v_organizer_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT full_name, slug INTO v_participant_name, v_participant_slug
  FROM user_profiles WHERE id = NEW.user_id;

  PERFORM create_notification(
    v_organizer_id,
    'event_join',
    'Nouveau participant',
    COALESCE(v_participant_name, 'Un utilisateur') || ' a rejoint ' || v_event_name,
    jsonb_build_object('event_id', NEW.event_id, 'event_slug', v_event_slug, 'user_id', NEW.user_id, 'user_slug', v_participant_slug)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_on_event_join
AFTER INSERT ON public.user_event
FOR EACH ROW EXECUTE FUNCTION public.notify_on_event_join();

-- Trigger pour demande d'accès à un événement
CREATE OR REPLACE FUNCTION public.notify_on_event_access_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_organizer_id uuid;
  v_event_name text;
  v_event_slug text;
  v_requester_name text;
  v_requester_slug text;
BEGIN
  SELECT organizer_id, name, slug INTO v_organizer_id, v_event_name, v_event_slug
  FROM event WHERE id = NEW.event_id;
  
  IF v_organizer_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT full_name, slug INTO v_requester_name, v_requester_slug
  FROM user_profiles WHERE id = NEW.user_id;

  PERFORM create_notification(
    v_organizer_id,
    'event_access_request',
    'Demande d''accès',
    COALESCE(v_requester_name, 'Un utilisateur') || ' demande l''accès à ' || v_event_name,
    jsonb_build_object('event_id', NEW.event_id, 'event_slug', v_event_slug, 'request_id', NEW.id, 'user_id', NEW.user_id, 'user_slug', v_requester_slug)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_on_event_access_request
AFTER INSERT ON public.event_access_request
FOR EACH ROW EXECUTE FUNCTION public.notify_on_event_access_request();

-- Trigger pour demande de remboursement
CREATE OR REPLACE FUNCTION public.notify_on_refund_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_organizer_id uuid;
  v_event_name text;
  v_event_slug text;
  v_requester_name text;
BEGIN
  SELECT organizer_id, name, slug INTO v_organizer_id, v_event_name, v_event_slug
  FROM event WHERE id = NEW.event_id;
  
  IF v_organizer_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO v_requester_name
  FROM user_profiles WHERE id = NEW.user_id;

  PERFORM create_notification(
    v_organizer_id,
    'refund_request',
    'Demande de remboursement',
    COALESCE(v_requester_name, 'Un utilisateur') || ' demande un remboursement pour ' || v_event_name,
    jsonb_build_object('event_id', NEW.event_id, 'event_slug', v_event_slug, 'request_id', NEW.id, 'amount', NEW.refund_amount)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_on_refund_request
AFTER INSERT ON public.event_refund_request
FOR EACH ROW EXECUTE FUNCTION public.notify_on_refund_request();

-- Trigger pour invitation à un événement
CREATE OR REPLACE FUNCTION public.notify_on_event_invitation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_name text;
  v_event_slug text;
  v_inviter_name text;
BEGIN
  IF NEW.invitee_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT name, slug INTO v_event_name, v_event_slug
  FROM event WHERE id = NEW.event_id;

  SELECT full_name INTO v_inviter_name
  FROM user_profiles WHERE id = NEW.inviter_id;

  PERFORM create_notification(
    NEW.invitee_user_id,
    'event_invitation',
    'Invitation à un événement',
    COALESCE(v_inviter_name, 'Un organisateur') || ' vous invite à ' || v_event_name,
    jsonb_build_object('event_id', NEW.event_id, 'event_slug', v_event_slug, 'invitation_id', NEW.id, 'token', NEW.token)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_on_event_invitation
AFTER INSERT ON public.event_invitation
FOR EACH ROW EXECUTE FUNCTION public.notify_on_event_invitation();

-- Trigger pour invitation à une cave
CREATE OR REPLACE FUNCTION public.notify_on_cellar_invitation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cellar_name text;
  v_cellar_slug text;
  v_inviter_name text;
BEGIN
  IF NEW.invitee_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT name, slug INTO v_cellar_name, v_cellar_slug
  FROM cellar WHERE id = NEW.cellar_id;

  SELECT full_name INTO v_inviter_name
  FROM user_profiles WHERE id = NEW.inviter_id;

  PERFORM create_notification(
    NEW.invitee_user_id,
    'cellar_invitation',
    'Invitation à une cave',
    COALESCE(v_inviter_name, 'Un gestionnaire') || ' vous invite à rejoindre ' || v_cellar_name,
    jsonb_build_object('cellar_id', NEW.cellar_id, 'cellar_slug', v_cellar_slug, 'invitation_id', NEW.id, 'token', NEW.token)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_on_cellar_invitation
AFTER INSERT ON public.cellar_invitation
FOR EACH ROW EXECUTE FUNCTION public.notify_on_cellar_invitation();