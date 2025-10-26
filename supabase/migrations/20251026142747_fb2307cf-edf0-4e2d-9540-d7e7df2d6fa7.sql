-- Corriger les politiques RLS pour user_domain en mode permissif
-- Cela permet aux super admins d'insérer des relations pour n'importe quel utilisateur

-- Supprimer les anciennes politiques INSERT restrictives
DROP POLICY IF EXISTS "Super admins peuvent créer des relations user_domain" ON user_domain;
DROP POLICY IF EXISTS "Utilisateurs peuvent créer leurs liens domaines" ON user_domain;

-- Recréer les politiques en mode PERMISSIF (avec USING au lieu de AS RESTRICTIVE)
CREATE POLICY "Super admins peuvent créer des relations user_domain"
ON user_domain
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Utilisateurs peuvent créer leurs liens domaines"
ON user_domain
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
);