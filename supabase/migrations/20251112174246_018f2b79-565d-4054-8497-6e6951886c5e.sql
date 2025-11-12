-- =====================================================
-- Migration: Sécurisation système d'invitations cave
-- =====================================================

-- 1. CELLAR_INVITATION : Refonte des policies
-- =====================================================

-- Supprimer les policies existantes problématiques
DROP POLICY IF EXISTS "Owners can manage cellar invitations" ON cellar_invitation;
DROP POLICY IF EXISTS "Users can update their own invitations" ON cellar_invitation;

-- INSERT : Owner ou Co-owner peuvent créer des invitations
CREATE POLICY "Owners and co-owners can create invitations"
ON cellar_invitation
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_cellar
    WHERE user_cellar.user_cellar_id = cellar_invitation.cellar_id
    AND user_cellar.user_id = auth.uid()
    AND user_cellar.role IN ('owner', 'co_owner')
  )
);

-- DELETE : L'invité lui-même OU owner/co-owner de la cave
CREATE POLICY "Invitees and cellar owners can delete invitations"
ON cellar_invitation
FOR DELETE
TO authenticated
USING (
  -- Cas 1 : L'utilisateur est l'invité (email match)
  (
    invitee_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  )
  OR
  -- Cas 2 : L'utilisateur est owner ou co_owner de la cave
  (
    EXISTS (
      SELECT 1 FROM user_cellar
      WHERE user_cellar.user_cellar_id = cellar_invitation.cellar_id
      AND user_cellar.user_id = auth.uid()
      AND user_cellar.role IN ('owner', 'co_owner')
    )
  )
);

-- Note : SELECT reste inchangée (déjà OK)
-- Note : UPDATE n'a pas de policy = interdite


-- 2. USER_CELLAR : Amélioration policy INSERT
-- =====================================================

-- Supprimer la policy actuelle trop restrictive
DROP POLICY IF EXISTS "Users can insert their own memberships" ON user_cellar;

-- Nouvelle policy avec 3 cas d'usage
CREATE POLICY "Users can join cellars via invitation or be added"
ON user_cellar
FOR INSERT
TO authenticated
WITH CHECK (
  -- Cas 1 : Acceptation d'invitation (email match + invitation valide)
  (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM cellar_invitation
      WHERE cellar_invitation.cellar_id = user_cellar.user_cellar_id
      AND cellar_invitation.invitee_email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
      AND cellar_invitation.status = 'pending'
      AND cellar_invitation.expires_at > now()
    )
  )
  OR
  -- Cas 2 : Owner ou co-owner ajoute quelqu'un
  (
    EXISTS (
      SELECT 1 FROM user_cellar uc
      WHERE uc.user_cellar_id = user_cellar.user_cellar_id
      AND uc.user_id = auth.uid()
      AND uc.role IN ('owner', 'co_owner')
    )
  )
  OR
  -- Cas 3 : Super admin peut tout faire
  (
    has_role(auth.uid(), 'super_admin')
  )
);


-- 3. FONCTION DE NETTOYAGE (optionnel mais recommandé)
-- =====================================================

-- Fonction pour supprimer automatiquement les invitations expirées
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM cellar_invitation
  WHERE expires_at < now()
  AND status = 'pending';
END;
$$;