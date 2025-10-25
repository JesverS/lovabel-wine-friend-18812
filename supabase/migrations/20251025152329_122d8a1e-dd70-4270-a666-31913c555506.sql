-- Politique RLS pour user_domain_application

-- Permettre aux utilisateurs de voir leurs propres demandes
CREATE POLICY "Utilisateurs peuvent voir leurs demandes"
ON public.user_domain_application
FOR SELECT
USING (auth.uid() = user_id);

-- Permettre aux utilisateurs de créer des demandes
CREATE POLICY "Utilisateurs peuvent créer des demandes"
ON public.user_domain_application
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Permettre aux propriétaires et administrateurs de voir les demandes pour leurs domaines
CREATE POLICY "Propriétaires/Admin voient demandes de leur domaine"
ON public.user_domain_application
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_domain
    WHERE domain_id = user_domain_application.domain_id
    AND user_id = auth.uid()
    AND role IN (1, 2)
  )
);

-- Permettre aux propriétaires et administrateurs de supprimer les demandes
CREATE POLICY "Propriétaires/Admin suppriment demandes"
ON public.user_domain_application
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_domain
    WHERE domain_id = user_domain_application.domain_id
    AND user_id = auth.uid()
    AND role IN (1, 2)
  )
);

-- Mise à jour des politiques user_domain pour respecter les rôles
DROP POLICY IF EXISTS "Utilisateurs liés au domaine peuvent le modifier" ON public.domain;
CREATE POLICY "Propriétaires/Admin modifient domaine"
ON public.domain
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_domain
    WHERE domain_id = domain.id
    AND user_id = auth.uid()
    AND role IN (1, 2)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_domain
    WHERE domain_id = domain.id
    AND user_id = auth.uid()
    AND role IN (1, 2)
  )
);

DROP POLICY IF EXISTS "Utilisateurs liés au domaine peuvent le supprimer" ON public.domain;
CREATE POLICY "Propriétaires suppriment domaine"
ON public.domain
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_domain
    WHERE domain_id = domain.id
    AND user_id = auth.uid()
    AND role = 1
  )
);

-- Mise à jour des politiques wine pour respecter les rôles
DROP POLICY IF EXISTS "Utilisateurs liés au domaine peuvent modifier les vins" ON public.wine;
CREATE POLICY "Membres domaine modifient vins"
ON public.wine
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_domain
    WHERE domain_id = wine.domain_id
    AND user_id = auth.uid()
    AND role IN (1, 2, 3)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_domain
    WHERE domain_id = wine.domain_id
    AND user_id = auth.uid()
    AND role IN (1, 2, 3)
  )
);

DROP POLICY IF EXISTS "Utilisateurs liés au domaine peuvent supprimer les vins" ON public.wine;
CREATE POLICY "Propriétaires/Admin suppriment vins"
ON public.wine
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_domain
    WHERE domain_id = wine.domain_id
    AND user_id = auth.uid()
    AND role IN (1, 2)
  )
);