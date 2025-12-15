-- Recréer la fonction update_follow_counts avec SECURITY DEFINER
-- Cela permet au trigger de modifier user_follow_counts sans erreur RLS

CREATE OR REPLACE FUNCTION public.update_follow_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  was_accepted BOOLEAN;
  is_accepted BOOLEAN;
BEGIN
  -- Cas INSERT : nouveau follow créé
  IF TG_OP = 'INSERT' THEN
    -- Si le status est directement 'accepted' (compte public)
    IF NEW.status = 'accepted' THEN
      -- Incrémenter followers_count du profil suivi
      INSERT INTO public.user_follow_counts (user_id, followers_count, following_count)
      VALUES (NEW.following_id, 1, 0)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        followers_count = user_follow_counts.followers_count + 1,
        updated_at = now();
      
      -- Incrémenter following_count du follower
      INSERT INTO public.user_follow_counts (user_id, followers_count, following_count)
      VALUES (NEW.follower_id, 0, 1)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        following_count = user_follow_counts.following_count + 1,
        updated_at = now();
    END IF;
    -- Si status = 'pending', on ne fait rien (pas encore accepté)
    
    RETURN NEW;
  
  -- Cas UPDATE : changement de status
  ELSIF TG_OP = 'UPDATE' THEN
    was_accepted := (OLD.status = 'accepted');
    is_accepted := (NEW.status = 'accepted');
    
    -- Si passage de pending/rejected → accepted
    IF NOT was_accepted AND is_accepted THEN
      -- Incrémenter followers_count du profil suivi
      INSERT INTO public.user_follow_counts (user_id, followers_count, following_count)
      VALUES (NEW.following_id, 1, 0)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        followers_count = user_follow_counts.followers_count + 1,
        updated_at = now();
      
      -- Incrémenter following_count du follower
      INSERT INTO public.user_follow_counts (user_id, followers_count, following_count)
      VALUES (NEW.follower_id, 0, 1)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        following_count = user_follow_counts.following_count + 1,
        updated_at = now();
    
    -- Si passage de accepted → pending/rejected
    ELSIF was_accepted AND NOT is_accepted THEN
      -- Décrémenter followers_count du profil suivi
      UPDATE public.user_follow_counts
      SET 
        followers_count = GREATEST(0, followers_count - 1),
        updated_at = now()
      WHERE user_id = NEW.following_id;
      
      -- Décrémenter following_count du follower
      UPDATE public.user_follow_counts
      SET 
        following_count = GREATEST(0, following_count - 1),
        updated_at = now()
      WHERE user_id = NEW.follower_id;
    END IF;
    
    RETURN NEW;
  
  -- Cas DELETE : suppression du follow
  ELSIF TG_OP = 'DELETE' THEN
    -- Seulement si le follow était accepté
    IF OLD.status = 'accepted' THEN
      -- Décrémenter followers_count du profil suivi
      UPDATE public.user_follow_counts
      SET 
        followers_count = GREATEST(0, followers_count - 1),
        updated_at = now()
      WHERE user_id = OLD.following_id;
      
      -- Décrémenter following_count du follower
      UPDATE public.user_follow_counts
      SET 
        following_count = GREATEST(0, following_count - 1),
        updated_at = now()
      WHERE user_id = OLD.follower_id;
    END IF;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;