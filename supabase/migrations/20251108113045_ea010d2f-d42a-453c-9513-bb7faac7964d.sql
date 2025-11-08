-- Enable RLS on wine_type table
ALTER TABLE public.wine_type ENABLE ROW LEVEL SECURITY;

-- Enable RLS on wine_classification table
ALTER TABLE public.wine_classification ENABLE ROW LEVEL SECURITY;

-- Policies pour wine_type
CREATE POLICY "Tout le monde peut voir les types de vin"
ON public.wine_type
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Super admins peuvent créer des types de vin"
ON public.wine_type
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins peuvent modifier des types de vin"
ON public.wine_type
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins peuvent supprimer des types de vin"
ON public.wine_type
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Policies pour wine_classification
CREATE POLICY "Tout le monde peut voir les classifications de vin"
ON public.wine_classification
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Super admins peuvent créer des classifications de vin"
ON public.wine_classification
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins peuvent modifier des classifications de vin"
ON public.wine_classification
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins peuvent supprimer des classifications de vin"
ON public.wine_classification
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));