-- Add RLS policies for user_domain table
CREATE POLICY "Utilisateurs peuvent voir leurs liens domaines"
ON public.user_domain
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Utilisateurs peuvent créer leurs liens domaines"
ON public.user_domain
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Utilisateurs peuvent modifier leurs liens domaines"
ON public.user_domain
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Utilisateurs peuvent supprimer leurs liens domaines"
ON public.user_domain
FOR DELETE
TO authenticated
USING (user_id = auth.uid());