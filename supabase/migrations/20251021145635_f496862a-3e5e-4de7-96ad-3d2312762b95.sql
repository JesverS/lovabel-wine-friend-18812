-- First, fix the user_id column type in user_domain
ALTER TABLE public.user_domain 
ALTER COLUMN user_id TYPE uuid USING user_id::text::uuid;

-- Drop the restrictive admin policy on domain
DROP POLICY IF EXISTS "Admin peut modifier domaines" ON public.domain;

-- Allow authenticated users to create domains
CREATE POLICY "Utilisateurs authentifiés peuvent créer des domaines"
ON public.domain
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users linked to a domain to update it
CREATE POLICY "Utilisateurs liés au domaine peuvent le modifier"
ON public.domain
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_domain
    WHERE user_domain.domain_id = domain.id
    AND user_domain.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_domain
    WHERE user_domain.domain_id = domain.id
    AND user_domain.user_id = auth.uid()
  )
);

-- Allow users linked to a domain to delete it
CREATE POLICY "Utilisateurs liés au domaine peuvent le supprimer"
ON public.domain
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_domain
    WHERE user_domain.domain_id = domain.id
    AND user_domain.user_id = auth.uid()
  )
);