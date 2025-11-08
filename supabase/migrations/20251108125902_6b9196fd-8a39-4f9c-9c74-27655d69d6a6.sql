-- Fonction pour vérifier si l'utilisateur possède la notice
CREATE OR REPLACE FUNCTION public.user_owns_wine_notice(_user_id uuid, _notice_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_wine_notice
    WHERE id = _notice_id
    AND user_id = _user_id
  )
$$;

-- Activer RLS sur user_wine_notice_event
ALTER TABLE public.user_wine_notice_event ENABLE ROW LEVEL SECURITY;

-- Policy INSERT: utilisateur peut créer un lien s'il possède la notice
CREATE POLICY "Utilisateurs créent liens pour leurs notices"
ON public.user_wine_notice_event
FOR INSERT
TO authenticated
WITH CHECK (public.user_owns_wine_notice(auth.uid(), user_wine_notice_id));

-- Policy SELECT: utilisateur peut voir les liens de ses notices
CREATE POLICY "Utilisateurs voient liens de leurs notices"
ON public.user_wine_notice_event
FOR SELECT
TO authenticated
USING (public.user_owns_wine_notice(auth.uid(), user_wine_notice_id));

-- Policy DELETE: super admins ou propriétaire de la notice
CREATE POLICY "Super admins et propriétaires suppriment liens"
ON public.user_wine_notice_event
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') 
  OR public.user_owns_wine_notice(auth.uid(), user_wine_notice_id)
);