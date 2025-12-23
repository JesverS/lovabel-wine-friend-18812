-- ============================================
-- PHASE 1: Fonctions helper pour la sécurité des profils privés
-- ============================================

-- Fonction pour vérifier si un utilisateur peut voir le contenu d'un profil
CREATE OR REPLACE FUNCTION public.can_view_profile_content(_viewer_id uuid, _profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    _viewer_id = _profile_id  -- Son propre profil
    OR EXISTS (SELECT 1 FROM user_profiles WHERE id = _profile_id AND is_public = true)  -- Profil public
    OR EXISTS (
      SELECT 1 FROM user_follow 
      WHERE follower_id = _viewer_id 
      AND following_id = _profile_id 
      AND status = 'accepted'
    );  -- Abonné accepté
$$;

-- ============================================
-- PHASE 2: Trigger auto-accept pour les profils publics
-- ============================================

-- Fonction trigger pour auto-accepter les follows vers profils publics
CREATE OR REPLACE FUNCTION public.auto_accept_public_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si le profil suivi est public, accepter automatiquement
  IF EXISTS (SELECT 1 FROM user_profiles WHERE id = NEW.following_id AND is_public = true) THEN
    NEW.status := 'accepted';
  END IF;
  RETURN NEW;
END;
$$;

-- Créer le trigger BEFORE INSERT sur user_follow
DROP TRIGGER IF EXISTS before_follow_auto_accept ON user_follow;
CREATE TRIGGER before_follow_auto_accept
BEFORE INSERT ON user_follow
FOR EACH ROW EXECUTE FUNCTION auto_accept_public_follow();

-- ============================================
-- PHASE 3: Corriger les RLS sur les tables sensibles
-- ============================================

-- 3.1 - RLS sur post
DROP POLICY IF EXISTS "Posts visibles par utilisateurs connectés" ON post;
DROP POLICY IF EXISTS "Posts visibles selon confidentialité profil" ON post;

CREATE POLICY "Posts visibles selon confidentialité profil"
ON post FOR SELECT TO authenticated
USING (public.can_view_profile_content(auth.uid(), user_id));

-- 3.2 - RLS sur post_comment
DROP POLICY IF EXISTS "Commentaires publiquement lisibles" ON post_comment;
DROP POLICY IF EXISTS "Commentaires visibles selon post parent" ON post_comment;

CREATE POLICY "Commentaires visibles selon post parent"
ON post_comment FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM post 
    WHERE post.id = post_comment.post_id 
    AND public.can_view_profile_content(auth.uid(), post.user_id)
  )
);

-- 3.3 - RLS sur post_like
DROP POLICY IF EXISTS "Likes publiquement lisibles" ON post_like;
DROP POLICY IF EXISTS "Likes visibles selon post parent" ON post_like;

CREATE POLICY "Likes visibles selon post parent"
ON post_like FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM post 
    WHERE post.id = post_like.post_id 
    AND public.can_view_profile_content(auth.uid(), post.user_id)
  )
);

-- 3.4 - RLS sur post_comment_like
DROP POLICY IF EXISTS "Likes de commentaires publiquement lisibles" ON post_comment_like;
DROP POLICY IF EXISTS "Likes commentaires visibles selon post" ON post_comment_like;

CREATE POLICY "Likes commentaires visibles selon post"
ON post_comment_like FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM post_comment pc
    JOIN post p ON p.id = pc.post_id
    WHERE pc.id = post_comment_like.comment_id 
    AND public.can_view_profile_content(auth.uid(), p.user_id)
  )
);

-- 3.5 - RLS sur user_favorite
DROP POLICY IF EXISTS "Favoris publiquement lisibles" ON user_favorite;
DROP POLICY IF EXISTS "Favoris visibles selon confidentialité profil" ON user_favorite;

CREATE POLICY "Favoris visibles selon confidentialité profil"
ON user_favorite FOR SELECT TO authenticated
USING (public.can_view_profile_content(auth.uid(), user_id));