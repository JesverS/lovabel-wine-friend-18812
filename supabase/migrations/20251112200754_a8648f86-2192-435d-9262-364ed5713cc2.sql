-- Create security definer function to safely get user email
CREATE OR REPLACE FUNCTION public.get_user_email(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email::text
  FROM auth.users
  WHERE id = _user_id;
$$;

-- Drop and recreate user_cellar INSERT policy with the new function
DROP POLICY IF EXISTS "Users can join cellars via invitation or be added" ON public.user_cellar;

CREATE POLICY "Users can join cellars via invitation or be added" 
ON public.user_cellar
FOR INSERT
WITH CHECK (
  (
    (auth.uid() = user_id) 
    AND (
      EXISTS (
        SELECT 1
        FROM cellar_invitation
        WHERE cellar_invitation.cellar_id = user_cellar.user_cellar_id
        AND cellar_invitation.invitee_email = public.get_user_email(auth.uid())
        AND cellar_invitation.status = 'pending'
        AND cellar_invitation.expires_at > now()
      )
    )
  ) 
  OR (
    EXISTS (
      SELECT 1
      FROM user_cellar uc
      WHERE uc.user_cellar_id = user_cellar.user_cellar_id
      AND uc.user_id = auth.uid()
      AND uc.role IN ('owner', 'co_owner')
    )
  ) 
  OR public.has_role(auth.uid(), 'super_admin')
);

-- Drop and recreate cellar_invitation DELETE policy with the new function
DROP POLICY IF EXISTS "Invitees and cellar owners can delete invitations" ON public.cellar_invitation;

CREATE POLICY "Invitees and cellar owners can delete invitations" 
ON public.cellar_invitation
FOR DELETE
USING (
  invitee_email = public.get_user_email(auth.uid())
  OR (
    EXISTS (
      SELECT 1
      FROM user_cellar
      WHERE user_cellar.user_cellar_id = cellar_invitation.cellar_id
      AND user_cellar.user_id = auth.uid()
      AND user_cellar.role IN ('owner', 'co_owner')
    )
  )
);