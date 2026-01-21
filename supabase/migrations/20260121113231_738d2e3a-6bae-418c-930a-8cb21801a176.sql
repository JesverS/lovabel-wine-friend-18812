-- =====================================================
-- PHASE 3: Sécurisation RLS pour user_follow et user_event
-- =====================================================

-- 1. SÉCURISER user_follow
-- Supprimer les anciennes policies trop permissives
DROP POLICY IF EXISTS "Follows publiquement lisibles" ON public.user_follow;
DROP POLICY IF EXISTS "Anyone can view follows" ON public.user_follow;

-- Nouvelle policy: voir les follows selon la confidentialité du profil
CREATE POLICY "user_follow_select_restricted" 
ON public.user_follow 
FOR SELECT 
USING (
  -- Ses propres follows (en tant que follower ou following)
  auth.uid() = follower_id 
  OR auth.uid() = following_id
  -- OU le profil suivi est public
  OR EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = user_follow.following_id AND is_public = true
  )
  -- OU l'utilisateur est abonné accepté du profil suivi
  OR EXISTS (
    SELECT 1 FROM user_follow uf2
    WHERE uf2.follower_id = auth.uid()
    AND uf2.following_id = user_follow.following_id
    AND uf2.status = 'accepted'
  )
);

-- 2. SÉCURISER user_event
-- Supprimer l'ancienne policy trop permissive
DROP POLICY IF EXISTS "Users can see their own participations" ON public.user_event;
DROP POLICY IF EXISTS "Participants voient événements" ON public.user_event;

-- Nouvelle policy équilibrée pour user_event
CREATE POLICY "user_event_select_restricted" 
ON public.user_event 
FOR SELECT 
USING (
  -- Voir ses propres participations
  auth.uid() = user_id
  -- OU être organisateur/co-organisateur de l'événement
  OR EXISTS (
    SELECT 1 FROM user_event ue2
    WHERE ue2.event_id = user_event.event_id
    AND ue2.user_id = auth.uid()
    AND ue2.role IN ('organizer', 'co_organizer')
  )
  -- OU l'événement est public ET la liste des participants n'est pas confidentielle
  OR EXISTS (
    SELECT 1 FROM event e
    WHERE e.id = user_event.event_id
    AND e.is_public = true
    AND e.confidential_participant_list = false
  )
);