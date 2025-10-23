-- Enable RLS on user_wine_comment_reaction if not already enabled
ALTER TABLE public.user_wine_comment_reaction ENABLE ROW LEVEL SECURITY;

-- Allow users to read all reactions
CREATE POLICY "Réactions publiquement lisibles"
ON public.user_wine_comment_reaction
FOR SELECT
USING (true);

-- Allow users to create their own reactions
CREATE POLICY "Utilisateurs créent leurs réactions"
ON public.user_wine_comment_reaction
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own reactions
CREATE POLICY "Utilisateurs modifient leurs réactions"
ON public.user_wine_comment_reaction
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own reactions
CREATE POLICY "Utilisateurs suppriment leurs réactions"
ON public.user_wine_comment_reaction
FOR DELETE
USING (auth.uid() = user_id);