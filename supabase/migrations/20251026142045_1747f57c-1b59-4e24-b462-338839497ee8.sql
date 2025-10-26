-- Modifier la fonction pour permettre aux super admins de voir toutes les demandes
DROP FUNCTION IF EXISTS public.get_team_applications_without_owner();

CREATE OR REPLACE FUNCTION public.get_team_applications_without_owner()
RETURNS TABLE (
  user_id uuid,
  domain_id uuid,
  role smallint,
  created_at timestamp with time zone,
  domain jsonb,
  user_profiles jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    uda.user_id,
    uda.domain_id,
    uda.role,
    uda.created_at,
    jsonb_build_object(
      'id', d.id,
      'name', d.name,
      'description', d.description
    ) as domain,
    jsonb_build_object(
      'id', up.id,
      'full_name', up.full_name
    ) as user_profiles
  FROM user_domain_application uda
  JOIN domain d ON d.id = uda.domain_id
  JOIN user_profiles up ON up.id = uda.user_id
  WHERE 
    -- Si l'utilisateur est super admin, afficher toutes les demandes
    (public.has_role(auth.uid(), 'super_admin'::app_role))
    OR
    -- Sinon, appliquer les règles hiérarchiques
    (
      -- Demande d'admin (rang 2): afficher uniquement s'il n'y a pas de propriétaire
      (uda.role = 2 AND NOT EXISTS (
        SELECT 1
        FROM user_domain ud
        WHERE ud.domain_id = uda.domain_id
        AND ud.role = 1
      ))
      OR
      -- Demande de membre (rang 3): afficher uniquement s'il n'y a ni propriétaire ni admin
      (uda.role = 3 AND NOT EXISTS (
        SELECT 1
        FROM user_domain ud
        WHERE ud.domain_id = uda.domain_id
        AND ud.role IN (1, 2)
      ))
    )
  ORDER BY uda.created_at DESC;
$$;