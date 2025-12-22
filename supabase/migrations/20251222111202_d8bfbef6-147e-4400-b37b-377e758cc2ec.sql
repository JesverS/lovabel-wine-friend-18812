-- =====================================================
-- Phase 1: Compteur de likes sur les posts
-- =====================================================

-- 1.1 Ajouter la colonne likes_count sur post
ALTER TABLE public.post 
ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0;

-- 1.2 Créer la fonction trigger pour mettre à jour le compteur de likes
CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.post 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.post 
    SET likes_count = GREATEST(0, likes_count - 1) 
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 1.3 Créer le trigger sur post_like
DROP TRIGGER IF EXISTS trigger_update_post_likes_count ON public.post_like;
CREATE TRIGGER trigger_update_post_likes_count
AFTER INSERT OR DELETE ON public.post_like
FOR EACH ROW
EXECUTE FUNCTION public.update_post_likes_count();

-- 1.4 Initialiser les compteurs de likes existants
UPDATE public.post p
SET likes_count = (
  SELECT COUNT(*)::INTEGER 
  FROM public.post_like pl 
  WHERE pl.post_id = p.id
);

-- =====================================================
-- Phase 2: Compteur de participants sur les événements
-- =====================================================

-- 2.1 Ajouter la colonne participants_count sur event
ALTER TABLE public.event 
ADD COLUMN IF NOT EXISTS participants_count INTEGER NOT NULL DEFAULT 0;

-- 2.2 Créer la fonction trigger pour mettre à jour le compteur de participants
CREATE OR REPLACE FUNCTION public.update_event_participants_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.event 
    SET participants_count = participants_count + 1 
    WHERE id = NEW.event_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.event 
    SET participants_count = GREATEST(0, participants_count - 1) 
    WHERE id = OLD.event_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2.3 Créer le trigger sur user_event
DROP TRIGGER IF EXISTS trigger_update_event_participants_count ON public.user_event;
CREATE TRIGGER trigger_update_event_participants_count
AFTER INSERT OR DELETE ON public.user_event
FOR EACH ROW
EXECUTE FUNCTION public.update_event_participants_count();

-- 2.4 Initialiser les compteurs de participants existants
UPDATE public.event e
SET participants_count = (
  SELECT COUNT(*)::INTEGER 
  FROM public.user_event ue 
  WHERE ue.event_id = e.id
);

-- =====================================================
-- Phase 3: Index de performance
-- =====================================================

-- Index pour le tri du feed par date
CREATE INDEX IF NOT EXISTS idx_post_created_at ON public.post(created_at DESC);

-- Index pour le comptage des likes (améliore les lookups)
CREATE INDEX IF NOT EXISTS idx_post_like_post_id ON public.post_like(post_id);

-- Index pour le comptage des commentaires (améliore les lookups)
CREATE INDEX IF NOT EXISTS idx_post_comment_post_id ON public.post_comment(post_id);

-- Index pour la recherche de participants par événement
CREATE INDEX IF NOT EXISTS idx_user_event_event_id ON public.user_event(event_id);

-- Index pour les favoris par utilisateur
CREATE INDEX IF NOT EXISTS idx_user_favorite_user_id ON public.user_favorite(user_id);

-- Index pour les notes de dégustation par utilisateur
CREATE INDEX IF NOT EXISTS idx_user_wine_notice_user_id ON public.user_wine_notice(user_id);