-- 1. Ajouter la colonne likes_count sur post_comment
ALTER TABLE public.post_comment 
ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0;

-- 2. Créer la table post_comment_like
CREATE TABLE IF NOT EXISTS public.post_comment_like (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES public.post_comment(id) ON DELETE CASCADE,
  liked_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
  PRIMARY KEY (user_id, comment_id)
);

-- 3. Créer l'index pour les performances
CREATE INDEX IF NOT EXISTS idx_post_comment_like_comment_id ON public.post_comment_like(comment_id);

-- 4. Activer RLS
ALTER TABLE public.post_comment_like ENABLE ROW LEVEL SECURITY;

-- 5. Créer les politiques RLS
CREATE POLICY "Likes de commentaires publiquement lisibles" 
ON public.post_comment_like 
FOR SELECT 
USING (true);

CREATE POLICY "Utilisateurs créent leurs likes de commentaires" 
ON public.post_comment_like 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utilisateurs suppriment leurs likes de commentaires" 
ON public.post_comment_like 
FOR DELETE 
USING (auth.uid() = user_id);

-- 6. Créer la fonction trigger pour mettre à jour likes_count
CREATE OR REPLACE FUNCTION public.update_post_comment_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.post_comment 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.post_comment 
    SET likes_count = GREATEST(0, likes_count - 1) 
    WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 7. Créer le trigger
DROP TRIGGER IF EXISTS trigger_update_post_comment_likes_count ON public.post_comment_like;
CREATE TRIGGER trigger_update_post_comment_likes_count
AFTER INSERT OR DELETE ON public.post_comment_like
FOR EACH ROW
EXECUTE FUNCTION public.update_post_comment_likes_count();