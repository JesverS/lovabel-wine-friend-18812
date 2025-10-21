-- Ajouter une contrainte unique pour la table user_wine_notice
-- Cela permet d'utiliser upsert sur le trio user_id, wine_id, event_id
ALTER TABLE public.user_wine_notice 
DROP CONSTRAINT IF EXISTS user_wine_notice_unique;

ALTER TABLE public.user_wine_notice 
ADD CONSTRAINT user_wine_notice_unique 
UNIQUE (user_id, wine_id, event_id);