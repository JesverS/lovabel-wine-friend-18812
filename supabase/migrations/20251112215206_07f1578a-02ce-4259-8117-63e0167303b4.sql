-- Modifier la colonne role de user_event pour utiliser event_role (si pas déjà fait)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_event' 
    AND column_name = 'role' 
    AND udt_name != 'event_role'
  ) THEN
    ALTER TABLE user_event 
    ALTER COLUMN role TYPE event_role 
    USING role::text::event_role;
  END IF;
END $$;

-- Définir une valeur par défaut
ALTER TABLE user_event 
ALTER COLUMN role SET DEFAULT 'organizer'::event_role;

-- Créer la table event_invitation si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.event_invitation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES event(id) ON DELETE CASCADE NOT NULL,
  inviter_id uuid NOT NULL,
  invitee_email text NOT NULL,
  invitee_user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  role event_role NOT NULL DEFAULT 'admin'::event_role,
  token text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.event_invitation ENABLE ROW LEVEL SECURITY;

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_event_invitation_token ON event_invitation(token);
CREATE INDEX IF NOT EXISTS idx_event_invitation_event_id ON event_invitation(event_id);

-- RLS Policies pour event_invitation

-- SELECT : Public pour validation du token
DROP POLICY IF EXISTS "Invitations visibles par token" ON event_invitation;
CREATE POLICY "Invitations visibles par token"
ON event_invitation FOR SELECT
TO authenticated
USING (true);

-- INSERT : Organizer et co_organizer uniquement
DROP POLICY IF EXISTS "Organizer et co_organizer peuvent créer invitations" ON event_invitation;
CREATE POLICY "Organizer et co_organizer peuvent créer invitations"
ON event_invitation FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_event
    WHERE user_event.event_id = event_invitation.event_id
    AND user_event.user_id = auth.uid()
    AND user_event.role IN ('organizer'::event_role, 'co_organizer'::event_role)
  )
);

-- DELETE : Organizer/co_organizer OU l'invité
DROP POLICY IF EXISTS "Organizer/co_organizer et invité peuvent supprimer" ON event_invitation;
CREATE POLICY "Organizer/co_organizer et invité peuvent supprimer"
ON event_invitation FOR DELETE
TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM user_event
    WHERE user_event.event_id = event_invitation.event_id
    AND user_event.user_id = auth.uid()
    AND user_event.role IN ('organizer'::event_role, 'co_organizer'::event_role)
  ))
  OR
  (invitee_email = get_user_email(auth.uid()))
);

-- Supprimer les anciennes policies de user_event
DROP POLICY IF EXISTS "Utilisateurs peuvent voir participations événements" ON user_event;
DROP POLICY IF EXISTS "Organisateurs et utilisateurs peuvent créer participations" ON user_event;
DROP POLICY IF EXISTS "Organisateurs et utilisateurs peuvent supprimer participations" ON user_event;
DROP POLICY IF EXISTS "Organisateurs peuvent modifier participations" ON user_event;

-- Nouvelles RLS Policies pour user_event

-- SELECT : Voir ses propres participations OU si organizer/co_organizer
CREATE POLICY "Utilisateurs voient participations events"
ON user_event FOR SELECT
TO authenticated
USING (
  (auth.uid() = user_id)
  OR
  (EXISTS (
    SELECT 1 FROM user_event ue
    WHERE ue.event_id = user_event.event_id
    AND ue.user_id = auth.uid()
    AND ue.role IN ('organizer'::event_role, 'co_organizer'::event_role)
  ))
);

-- INSERT : Organizer/co_organizer ajoutent OU acceptation d'invitation
CREATE POLICY "Organizer/co_organizer ou invitation"
ON user_event FOR INSERT
TO authenticated
WITH CHECK (
  -- Cas 1 : Organizer ou co_organizer ajoutent directement
  (EXISTS (
    SELECT 1 FROM user_event ue
    WHERE ue.event_id = user_event.event_id
    AND ue.user_id = auth.uid()
    AND ue.role IN ('organizer'::event_role, 'co_organizer'::event_role)
  ))
  OR
  -- Cas 2 : Acceptation d'invitation avec vérification email
  (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM event_invitation
      WHERE event_invitation.event_id = user_event.event_id
      AND event_invitation.invitee_email = get_user_email(auth.uid())
      AND event_invitation.status = 'pending'
      AND event_invitation.expires_at > now()
    )
  )
);

-- DELETE : Organizer/co_organizer retirent OU auto-retrait
CREATE POLICY "Organizer/co_organizer ou auto-retrait"
ON user_event FOR DELETE
TO authenticated
USING (
  (auth.uid() = user_id)
  OR
  (EXISTS (
    SELECT 1 FROM user_event ue
    WHERE ue.event_id = user_event.event_id
    AND ue.user_id = auth.uid()
    AND ue.role IN ('organizer'::event_role, 'co_organizer'::event_role)
  ))
);

-- UPDATE : Organizer/co_organizer modifient rôles
CREATE POLICY "Organizer/co_organizer peuvent modifier rôles"
ON user_event FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_event ue
    WHERE ue.event_id = user_event.event_id
    AND ue.user_id = auth.uid()
    AND ue.role IN ('organizer'::event_role, 'co_organizer'::event_role)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_event ue
    WHERE ue.event_id = user_event.event_id
    AND ue.user_id = auth.uid()
    AND ue.role IN ('organizer'::event_role, 'co_organizer'::event_role)
  )
);

-- Supprimer les anciennes policies de event
DROP POLICY IF EXISTS "Organisateurs et participants peuvent modifier événements" ON event;
DROP POLICY IF EXISTS "Organisateurs peuvent supprimer leurs événements" ON event;

-- Nouvelles RLS Policies pour event

-- UPDATE : Organizer, co_organizer, admin
CREATE POLICY "Organizer/co_organizer/admin peuvent modifier event"
ON event FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_event
    WHERE user_event.event_id = event.id
    AND user_event.user_id = auth.uid()
    AND user_event.role IN ('organizer'::event_role, 'co_organizer'::event_role, 'admin'::event_role)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_event
    WHERE user_event.event_id = event.id
    AND user_event.user_id = auth.uid()
    AND user_event.role IN ('organizer'::event_role, 'co_organizer'::event_role, 'admin'::event_role)
  )
);

-- DELETE : Organizer uniquement
CREATE POLICY "Seul organizer peut supprimer event"
ON event FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_event
    WHERE user_event.event_id = event.id
    AND user_event.user_id = auth.uid()
    AND user_event.role = 'organizer'::event_role
  )
);

-- Supprimer les anciennes policies de event_domain et event_domain_wine
DROP POLICY IF EXISTS "Organisateurs gèrent event_domain" ON event_domain;
DROP POLICY IF EXISTS "Organisateurs gèrent event_domain_wine" ON event_domain_wine;

-- Nouvelles policies pour event_domain

CREATE POLICY "Organizer/co_organizer/admin gèrent domaines"
ON event_domain FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_event
    WHERE user_event.event_id = event_domain.event_id
    AND user_event.user_id = auth.uid()
    AND user_event.role IN ('organizer'::event_role, 'co_organizer'::event_role, 'admin'::event_role)
  )
);

-- Nouvelles policies pour event_domain_wine

CREATE POLICY "Organizer/co_organizer/admin gèrent vins"
ON event_domain_wine FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_event
    WHERE user_event.event_id = event_domain_wine.event_id
    AND user_event.user_id = auth.uid()
    AND user_event.role IN ('organizer'::event_role, 'co_organizer'::event_role, 'admin'::event_role)
  )
);

-- Fonction de nettoyage des invitations expirées
CREATE OR REPLACE FUNCTION cleanup_expired_event_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM event_invitation
  WHERE expires_at < now()
  AND status = 'pending';
END;
$$;