-- Permettre aux super admins de voir toutes les demandes d'application
CREATE POLICY "Super admins peuvent voir toutes les demandes"
ON public.user_domain_application
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Permettre aux super admins de supprimer toutes les demandes
CREATE POLICY "Super admins peuvent supprimer toutes les demandes"
ON public.user_domain_application
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Permettre aux super admins de créer des relations user_domain pour n'importe quel utilisateur
CREATE POLICY "Super admins peuvent créer des relations user_domain"
ON public.user_domain
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));