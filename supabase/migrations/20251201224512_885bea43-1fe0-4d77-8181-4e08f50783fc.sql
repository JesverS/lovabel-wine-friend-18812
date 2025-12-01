-- Phase 1: Migration base de données pour système d'accès événements

-- 1. Créer l'enum pour les types d'accès événement
CREATE TYPE event_access_type AS ENUM ('public', 'paid', 'request_based', 'invite_only');

-- 2. Ajouter les colonnes d'accès à la table event
ALTER TABLE event
ADD COLUMN access_type event_access_type NOT NULL DEFAULT 'public',
ADD COLUMN price DECIMAL(10, 2) DEFAULT NULL,
ADD COLUMN currency TEXT DEFAULT 'EUR',
ADD COLUMN confidential_address BOOLEAN DEFAULT FALSE,
ADD COLUMN confidential_phone BOOLEAN DEFAULT FALSE,
ADD COLUMN confidential_participant_list BOOLEAN DEFAULT FALSE,
ADD COLUMN confidential_documents TEXT[] DEFAULT NULL,
ADD COLUMN max_participants INTEGER DEFAULT NULL;

-- 3. Créer la table event_member pour gérer l'accès aux événements
CREATE TABLE event_member (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  access_type event_access_type NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- 4. Créer la table event_access_request pour les demandes d'accès
CREATE TABLE event_access_request (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by UUID,
  UNIQUE(event_id, user_id)
);

-- 5. Créer la table event_payment pour les paiements Stripe
CREATE TABLE event_payment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 6. Créer la table organizer_stripe_account pour Stripe Connect
CREATE TABLE organizer_stripe_account (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  stripe_account_id TEXT NOT NULL UNIQUE,
  account_status TEXT NOT NULL DEFAULT 'pending' CHECK (account_status IN ('pending', 'active', 'restricted', 'disabled')),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  charges_enabled BOOLEAN DEFAULT FALSE,
  payouts_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Créer la fonction pour vérifier l'accès utilisateur à un événement
CREATE OR REPLACE FUNCTION user_has_event_access(_user_id UUID, _event_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Organisateur a toujours accès
    SELECT 1 FROM event WHERE id = _event_id AND organizer_id = _user_id
    UNION
    -- Membre de l'équipe a toujours accès
    SELECT 1 FROM user_event WHERE event_id = _event_id AND user_id = _user_id
    UNION
    -- Membre approuvé a accès
    SELECT 1 FROM event_member WHERE event_id = _event_id AND user_id = _user_id
    UNION
    -- Événement public = accès pour tous
    SELECT 1 FROM event WHERE id = _event_id AND access_type = 'public'
  );
$$;

-- 8. Créer la fonction pour vérifier si l'utilisateur peut voir les infos confidentielles
CREATE OR REPLACE FUNCTION user_can_see_confidential_info(_user_id UUID, _event_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Organisateur voit tout
    SELECT 1 FROM event WHERE id = _event_id AND organizer_id = _user_id
    UNION
    -- Équipe voit tout
    SELECT 1 FROM user_event WHERE event_id = _event_id AND user_id = _user_id
    UNION
    -- Membre avec accès approuvé voit tout
    SELECT 1 FROM event_member WHERE event_id = _event_id AND user_id = _user_id
  );
$$;

-- 9. Activer RLS sur les nouvelles tables
ALTER TABLE event_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_access_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_payment ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizer_stripe_account ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies pour event_member
CREATE POLICY "Event members visible par organisateurs et membre"
ON event_member FOR SELECT
USING (
  user_is_event_organizer(auth.uid(), event_id)
  OR user_participates_in_event(auth.uid(), event_id)
  OR auth.uid() = user_id
);

CREATE POLICY "Organisateurs peuvent ajouter membres"
ON event_member FOR INSERT
WITH CHECK (
  user_is_event_organizer(auth.uid(), event_id)
  OR EXISTS (
    SELECT 1 FROM user_event
    WHERE event_id = event_member.event_id
    AND user_id = auth.uid()
    AND role = ANY(ARRAY['organizer'::event_role, 'co_organizer'::event_role])
  )
);

CREATE POLICY "Organisateurs peuvent supprimer membres"
ON event_member FOR DELETE
USING (
  user_is_event_organizer(auth.uid(), event_id)
  OR EXISTS (
    SELECT 1 FROM user_event
    WHERE event_id = event_member.event_id
    AND user_id = auth.uid()
    AND role = ANY(ARRAY['organizer'::event_role, 'co_organizer'::event_role])
  )
);

-- 11. RLS Policies pour event_access_request
CREATE POLICY "Utilisateurs voient leurs propres demandes"
ON event_access_request FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Organisateurs voient demandes événement"
ON event_access_request FOR SELECT
USING (
  user_is_event_organizer(auth.uid(), event_id)
  OR EXISTS (
    SELECT 1 FROM user_event
    WHERE event_id = event_access_request.event_id
    AND user_id = auth.uid()
    AND role = ANY(ARRAY['organizer'::event_role, 'co_organizer'::event_role])
  )
);

CREATE POLICY "Utilisateurs créent leurs demandes"
ON event_access_request FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Organisateurs traitent demandes"
ON event_access_request FOR UPDATE
USING (
  user_is_event_organizer(auth.uid(), event_id)
  OR EXISTS (
    SELECT 1 FROM user_event
    WHERE event_id = event_access_request.event_id
    AND user_id = auth.uid()
    AND role = ANY(ARRAY['organizer'::event_role, 'co_organizer'::event_role])
  )
);

CREATE POLICY "Utilisateurs suppriment leurs demandes"
ON event_access_request FOR DELETE
USING (auth.uid() = user_id);

-- 12. RLS Policies pour event_payment
CREATE POLICY "Utilisateurs voient leurs paiements"
ON event_payment FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Organisateurs voient paiements événement"
ON event_payment FOR SELECT
USING (
  user_is_event_organizer(auth.uid(), event_id)
  OR EXISTS (
    SELECT 1 FROM user_event
    WHERE event_id = event_payment.event_id
    AND user_id = auth.uid()
    AND role = 'organizer'::event_role
  )
);

CREATE POLICY "Système crée paiements"
ON event_payment FOR INSERT
WITH CHECK (true);

CREATE POLICY "Système met à jour paiements"
ON event_payment FOR UPDATE
USING (true);

-- 13. RLS Policies pour organizer_stripe_account
CREATE POLICY "Utilisateurs voient leur compte Stripe"
ON organizer_stripe_account FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Utilisateurs créent leur compte Stripe"
ON organizer_stripe_account FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utilisateurs mettent à jour leur compte Stripe"
ON organizer_stripe_account FOR UPDATE
USING (auth.uid() = user_id);

-- 14. Créer index pour optimisation
CREATE INDEX idx_event_member_event_id ON event_member(event_id);
CREATE INDEX idx_event_member_user_id ON event_member(user_id);
CREATE INDEX idx_event_access_request_event_id ON event_access_request(event_id);
CREATE INDEX idx_event_access_request_user_id ON event_access_request(user_id);
CREATE INDEX idx_event_access_request_status ON event_access_request(status);
CREATE INDEX idx_event_payment_event_id ON event_payment(event_id);
CREATE INDEX idx_event_payment_user_id ON event_payment(user_id);
CREATE INDEX idx_event_payment_stripe_session_id ON event_payment(stripe_session_id);
CREATE INDEX idx_event_payment_status ON event_payment(status);
CREATE INDEX idx_organizer_stripe_account_user_id ON organizer_stripe_account(user_id);

-- 15. Commentaires pour documentation
COMMENT ON TABLE event_member IS 'Utilisateurs ayant un accès approuvé à un événement';
COMMENT ON TABLE event_access_request IS 'Demandes d''accès en attente pour les événements à inscription';
COMMENT ON TABLE event_payment IS 'Paiements Stripe pour les événements payants';
COMMENT ON TABLE organizer_stripe_account IS 'Comptes Stripe Connect des organisateurs d''événements';
COMMENT ON FUNCTION user_has_event_access IS 'Vérifie si un utilisateur a accès à un événement (public, membre équipe, ou accès approuvé)';
COMMENT ON FUNCTION user_can_see_confidential_info IS 'Vérifie si un utilisateur peut voir les informations confidentielles d''un événement';