-- Add unique constraint for user_wine_comment
ALTER TABLE public.user_wine_comment 
ADD CONSTRAINT user_wine_comment_user_wine_unique UNIQUE (user_id, wine_id);

-- Enable RLS on user_wine_comment
ALTER TABLE public.user_wine_comment ENABLE ROW LEVEL SECURITY;

-- Policy: Public can read all comments
CREATE POLICY "Commentaires publiquement lisibles"
ON public.user_wine_comment
FOR SELECT
USING (true);

-- Policy: Users can create their own comments
CREATE POLICY "Utilisateurs créent leurs commentaires"
ON public.user_wine_comment
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own comments
CREATE POLICY "Utilisateurs modifient leurs commentaires"
ON public.user_wine_comment
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own comments
CREATE POLICY "Utilisateurs suppriment leurs commentaires"
ON public.user_wine_comment
FOR DELETE
USING (auth.uid() = user_id);