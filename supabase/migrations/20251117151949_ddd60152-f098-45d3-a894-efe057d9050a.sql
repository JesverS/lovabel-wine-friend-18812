-- Correction des RLS policies pour event_invitation et cellar_invitation
-- Utilisation de get_user_email() au lieu de SELECT inline sur auth.users

-- Correction pour event_invitation
DROP POLICY IF EXISTS "Event invitations restricted" ON event_invitation;

CREATE POLICY "Event invitations restricted" ON event_invitation
  FOR SELECT USING (
    inviter_id = auth.uid()
    OR invitee_email = get_user_email(auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_event 
      WHERE user_event.event_id = event_invitation.event_id 
      AND user_event.user_id = auth.uid() 
      AND user_event.role IN ('organizer', 'co_organizer')
    )
  );

-- Correction pour cellar_invitation
DROP POLICY IF EXISTS "Invitations visible par concernés" ON cellar_invitation;

CREATE POLICY "Invitations visible par concernés" ON cellar_invitation
  FOR SELECT USING (
    inviter_id = auth.uid() 
    OR invitee_email = get_user_email(auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_cellar 
      WHERE user_cellar.user_cellar_id = cellar_invitation.cellar_id 
      AND user_cellar.user_id = auth.uid() 
      AND user_cellar.role IN ('owner', 'co_owner')
    )
  );