-- Ajouter la colonne role à user_profiles avec une valeur par défaut
ALTER TABLE public.user_profiles 
ADD COLUMN role text NOT NULL DEFAULT 'user';

-- Ajouter une contrainte CHECK pour valider les valeurs possibles
ALTER TABLE public.user_profiles
ADD CONSTRAINT valid_role CHECK (role IN ('user', 'admin', 'super_admin'));

-- Créer une fonction sécurisée pour vérifier si l'utilisateur est super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role = 'super_admin'
  FROM public.user_profiles
  WHERE id = auth.uid();
$$;

-- Créer une fonction pour obtenir le rôle de l'utilisateur actuel
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_profiles
  WHERE id = auth.uid();
$$;

-- Supprimer l'ancienne policy de mise à jour
DROP POLICY IF EXISTS "Utilisateurs mettent à jour leur profil" ON public.user_profiles;

-- Policy 1: Tout le monde peut lire tous les profils (publics)
CREATE POLICY "public_select_profiles"
ON public.user_profiles
FOR SELECT
USING (true);

-- Policy 2: Les utilisateurs peuvent modifier leur propre profil, SAUF le champ role
CREATE POLICY "update_own_profile"
ON public.user_profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  AND role = (SELECT role FROM public.user_profiles WHERE id = auth.uid())
);

-- Policy 3: Seuls les super_admins peuvent modifier les rôles
CREATE POLICY "super_admin_manage_roles"
ON public.user_profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 
    FROM public.user_profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.user_profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'super_admin'
  )
);