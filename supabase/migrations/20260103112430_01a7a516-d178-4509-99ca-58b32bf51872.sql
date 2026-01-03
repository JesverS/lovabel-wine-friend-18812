-- Ajouter les colonnes pour le partage de posts
ALTER TABLE public.post 
ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS share_token_created_at TIMESTAMPTZ;

-- Index pour recherche rapide par token
CREATE INDEX IF NOT EXISTS idx_post_share_token ON public.post(share_token) WHERE share_token IS NOT NULL;

-- Policy pour permettre l'accès public aux posts via share_token
CREATE POLICY "Accès public via share_token" 
ON public.post 
FOR SELECT 
USING (share_token IS NOT NULL);

-- Policy pour permettre au propriétaire de générer un share_token
CREATE POLICY "Propriétaire peut mettre à jour share_token"
ON public.post
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);