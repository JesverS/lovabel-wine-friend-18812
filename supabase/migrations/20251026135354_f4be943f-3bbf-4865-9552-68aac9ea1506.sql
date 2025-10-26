-- Fonction pour récupérer les demandes d'équipe (admin/membre) pour les domaines sans propriétaire
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
  WHERE uda.role IN (2, 3)
  AND NOT EXISTS (
    SELECT 1
    FROM user_domain ud
    WHERE ud.domain_id = uda.domain_id
    AND ud.role = 1
  )
  ORDER BY uda.created_at DESC;
$$;