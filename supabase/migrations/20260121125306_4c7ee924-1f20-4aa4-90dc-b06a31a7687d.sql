-- =====================================================
-- CORRECTION: Remplacer policies récursives par fonctions SECURITY DEFINER
-- =====================================================

-- 1. FONCTION: Vérifier si l'utilisateur est abonné accepté d'un profil
CREATE OR REPLACE FUNCTION public.is_accepted_follower(
  _follower_id UUID, 
  _following_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_follow
    WHERE follower_id = _follower_id
    AND following_id = _following_id
    AND status = 'accepted'
  );
$$;

-- 2. FONCTION: Vérifier si l'utilisateur est organisateur d'un événement
CREATE OR REPLACE FUNCTION public.is_event_organizer(
  _user_id UUID, 
  _event_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_event
    WHERE user_id = _user_id
    AND event_id = _event_id
    AND role IN ('organizer', 'co_organizer')
  );
$$;

-- 3. REMPLACER la policy user_follow
DROP POLICY IF EXISTS "user_follow_select_restricted" ON public.user_follow;

CREATE POLICY "user_follow_select_restricted" 
ON public.user_follow 
FOR SELECT 
USING (
  -- Ses propres follows (en tant que follower ou following)
  auth.uid() = follower_id 
  OR auth.uid() = following_id
  -- OU le profil suivi est public
  OR EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = user_follow.following_id AND is_public = true
  )
  -- OU l'utilisateur est abonné accepté (via fonction SECURITY DEFINER)
  OR public.is_accepted_follower(auth.uid(), user_follow.following_id)
);

-- 4. REMPLACER la policy user_event
DROP POLICY IF EXISTS "user_event_select_restricted" ON public.user_event;

CREATE POLICY "user_event_select_restricted" 
ON public.user_event 
FOR SELECT 
USING (
  -- Voir ses propres participations
  auth.uid() = user_id
  -- OU être organisateur/co-organisateur (via fonction SECURITY DEFINER)
  OR public.is_event_organizer(auth.uid(), user_event.event_id)
  -- OU l'événement est public ET la liste des participants n'est pas confidentielle
  OR EXISTS (
    SELECT 1 FROM public.event e
    WHERE e.id = user_event.event_id
    AND e.is_public = true
    AND e.confidential_participant_list = false
  )
);