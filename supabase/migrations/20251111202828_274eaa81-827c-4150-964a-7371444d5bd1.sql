-- Create cellar_invitation table for managing cellar member invitations
CREATE TABLE public.cellar_invitation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cellar_id uuid REFERENCES cellar(id) ON DELETE CASCADE NOT NULL,
  inviter_id uuid NOT NULL,
  invitee_email text NOT NULL,
  invitee_user_id uuid,
  role text NOT NULL DEFAULT 'admin',
  token text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  
  UNIQUE(cellar_id, invitee_email, status) 
);

-- Add constraint to ensure only pending/accepted/rejected/expired statuses
ALTER TABLE public.cellar_invitation 
ADD CONSTRAINT cellar_invitation_status_check 
CHECK (status IN ('pending', 'accepted', 'rejected', 'expired'));

-- Add constraint to ensure role is valid
ALTER TABLE public.cellar_invitation 
ADD CONSTRAINT cellar_invitation_role_check 
CHECK (role IN ('admin', 'owner'));

-- Indexes for performance
CREATE INDEX idx_cellar_invitation_token ON public.cellar_invitation(token);
CREATE INDEX idx_cellar_invitation_status ON public.cellar_invitation(status);
CREATE INDEX idx_cellar_invitation_cellar_id ON public.cellar_invitation(cellar_id);
CREATE INDEX idx_cellar_invitation_invitee_email ON public.cellar_invitation(invitee_email);

-- Enable Row Level Security
ALTER TABLE public.cellar_invitation ENABLE ROW LEVEL SECURITY;

-- Policy: Owners can manage invitations for their cellars
CREATE POLICY "Owners can manage cellar invitations"
ON public.cellar_invitation
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_cellar
    WHERE user_cellar.user_cellar_id = cellar_invitation.cellar_id
    AND user_cellar.user_id = auth.uid()
    AND user_cellar.role = 'owner'
  )
);

-- Policy: Anyone can view invitations by token (for accepting/rejecting)
CREATE POLICY "Public can view invitations by token"
ON public.cellar_invitation
FOR SELECT
USING (true);

-- Policy: Authenticated users can update invitations they received (accept/reject)
CREATE POLICY "Users can update their own invitations"
ON public.cellar_invitation
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND (
    invitee_user_id = auth.uid() OR
    invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);