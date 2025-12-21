-- 1. Ajouter la colonne comment_count sur post
ALTER TABLE public.post 
ADD COLUMN IF NOT EXISTS comment_count INTEGER NOT NULL DEFAULT 0;

-- 2. Créer la fonction trigger pour mettre à jour le compteur
CREATE OR REPLACE FUNCTION public.update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.post 
    SET comment_count = comment_count + 1 
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.post 
    SET comment_count = GREATEST(0, comment_count - 1) 
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Créer le trigger sur post_comment
DROP TRIGGER IF EXISTS trigger_update_post_comment_count ON public.post_comment;
CREATE TRIGGER trigger_update_post_comment_count
AFTER INSERT OR DELETE ON public.post_comment
FOR EACH ROW
EXECUTE FUNCTION public.update_post_comment_count();

-- 4. Initialiser les compteurs existants
UPDATE public.post p
SET comment_count = (
  SELECT COUNT(*)::INTEGER 
  FROM public.post_comment pc 
  WHERE pc.post_id = p.id
);