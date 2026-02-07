
-- Table des clés d'invitation
CREATE TABLE public.invite_key (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  role_granted public.app_role NOT NULL DEFAULT 'premium',
  max_uses integer NOT NULL DEFAULT 1,
  remaining_uses integer NOT NULL DEFAULT 1,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index pour recherche rapide par code
CREATE INDEX idx_invite_key_code ON public.invite_key(code);

-- Table de tracking des utilisations
CREATE TABLE public.invite_key_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_key_id uuid NOT NULL REFERENCES public.invite_key(id),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(invite_key_id, user_id)
);

-- RLS sur invite_key (accès super_admin uniquement)
ALTER TABLE public.invite_key ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage invite keys"
ON public.invite_key
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- RLS sur invite_key_usage
ALTER TABLE public.invite_key_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own key usage"
ON public.invite_key_usage
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
