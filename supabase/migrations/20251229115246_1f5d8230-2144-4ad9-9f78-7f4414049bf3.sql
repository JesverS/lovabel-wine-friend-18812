-- ============================================
-- Table des acceptations CGU (hautement sécurisée)
-- ============================================

CREATE TABLE cgu_acceptance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cgu_version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acceptance_method TEXT NOT NULL, -- 'google_oauth', 'email_password'
  ip_address INET,
  user_agent TEXT,
  consent_text_hash TEXT NOT NULL, -- SHA-256 du texte CGU accepté
  
  -- Contrainte d'unicité pour éviter les doublons par version
  UNIQUE(user_id, cgu_version)
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_cgu_acceptance_user_id ON cgu_acceptance(user_id);
CREATE INDEX idx_cgu_acceptance_version ON cgu_acceptance(cgu_version);

-- RLS ultra-stricte
ALTER TABLE cgu_acceptance ENABLE ROW LEVEL SECURITY;

-- SELECT : l'utilisateur peut voir SES propres acceptations uniquement
CREATE POLICY "Users can view their own CGU acceptances"
  ON cgu_acceptance FOR SELECT
  USING (auth.uid() = user_id);

-- Pas de policy INSERT côté client (uniquement via Edge Function avec service_role)
-- Pas de policy UPDATE (interdit pour tout le monde)
-- Pas de policy DELETE (interdit pour tout le monde)