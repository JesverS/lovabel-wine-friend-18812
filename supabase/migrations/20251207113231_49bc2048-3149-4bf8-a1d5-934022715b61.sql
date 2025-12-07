-- Mettre à jour la fonction user_has_event_access pour ne plus utiliser event_member
CREATE OR REPLACE FUNCTION public.user_has_event_access(_user_id uuid, _event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    -- Organisateur a toujours accès
    SELECT 1 FROM event WHERE id = _event_id AND organizer_id = _user_id
    UNION
    -- Membre (équipe ou participant) a toujours accès
    SELECT 1 FROM user_event WHERE event_id = _event_id AND user_id = _user_id
    UNION
    -- Événement public = accès pour tous
    SELECT 1 FROM event WHERE id = _event_id AND access_type = 'public'
  );
$$;

-- Mettre à jour la fonction user_can_see_confidential_info
CREATE OR REPLACE FUNCTION public.user_can_see_confidential_info(_user_id uuid, _event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    -- Organisateur voit tout
    SELECT 1 FROM event WHERE id = _event_id AND organizer_id = _user_id
    UNION
    -- Membre (équipe ou participant) voit tout
    SELECT 1 FROM user_event WHERE event_id = _event_id AND user_id = _user_id
  );
$$;

-- Supprimer les RLS policies de event_member avant de supprimer la table
DROP POLICY IF EXISTS "Event members visible par organisateurs et membre" ON public.event_member;
DROP POLICY IF EXISTS "Organisateurs peuvent ajouter membres" ON public.event_member;
DROP POLICY IF EXISTS "Organisateurs peuvent supprimer membres" ON public.event_member;

-- Supprimer la table event_member (devenue obsolète)
DROP TABLE IF EXISTS public.event_member;