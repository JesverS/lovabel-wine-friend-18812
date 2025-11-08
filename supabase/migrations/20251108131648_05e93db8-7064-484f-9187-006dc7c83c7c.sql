-- Modifier la policy SELECT de user_wine_notice pour permettre à l'utilisateur 
-- de voir ses propres notices immédiatement après création
DROP POLICY IF EXISTS "Utilisateurs voient leurs propres avis" ON public.user_wine_notice;

CREATE POLICY "Utilisateurs voient leurs propres avis"
ON public.user_wine_notice
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);