-- Supprimer les posts orphelins (sans user_id)
DELETE FROM public.post WHERE user_id IS NULL;

-- Rendre la colonne user_id NOT NULL
ALTER TABLE public.post
ALTER COLUMN user_id SET NOT NULL;

-- Ajouter un commentaire pour documenter la contrainte
COMMENT ON COLUMN public.post.user_id IS 'ID de l''utilisateur propriétaire du post. Requis pour la sécurité RLS.';