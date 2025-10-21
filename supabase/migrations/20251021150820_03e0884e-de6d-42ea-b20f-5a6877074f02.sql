-- Fix wine table policies
DROP POLICY IF EXISTS "Admin peut modifier vins" ON public.wine;

-- Allow authenticated users to create wines
CREATE POLICY "Utilisateurs authentifiés peuvent créer des vins"
ON public.wine
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users linked to a domain to update wines from that domain
CREATE POLICY "Utilisateurs liés au domaine peuvent modifier les vins"
ON public.wine
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_domain
    WHERE user_domain.domain_id = wine.domain_id
    AND user_domain.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_domain
    WHERE user_domain.domain_id = wine.domain_id
    AND user_domain.user_id = auth.uid()
  )
);

-- Allow users linked to a domain to delete wines from that domain
CREATE POLICY "Utilisateurs liés au domaine peuvent supprimer les vins"
ON public.wine
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_domain
    WHERE user_domain.domain_id = wine.domain_id
    AND user_domain.user_id = auth.uid()
  )
);