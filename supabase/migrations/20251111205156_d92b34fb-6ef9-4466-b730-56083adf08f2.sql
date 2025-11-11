-- Supprimer l'ancienne policy trop restrictive de user_cellar
DROP POLICY IF EXISTS "Utilisateurs gèrent leurs relations caves" ON user_cellar;

-- SELECT : Les membres d'une cave peuvent voir tous les membres de cette cave
CREATE POLICY "Members can view cellar members"
ON user_cellar FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_cellar AS uc
    WHERE uc.user_cellar_id = user_cellar.user_cellar_id
    AND uc.user_id = auth.uid()
  )
);

-- INSERT : Un utilisateur peut s'ajouter lui-même
CREATE POLICY "Users can insert their own memberships"
ON user_cellar FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE : Un utilisateur peut mettre à jour ses propres memberships
CREATE POLICY "Users can update their own memberships"
ON user_cellar FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE : Owners/Co-owners peuvent supprimer d'autres membres, ou les utilisateurs peuvent se retirer
CREATE POLICY "Owners can remove members"
ON user_cellar FOR DELETE
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM user_cellar AS uc
    WHERE uc.user_cellar_id = user_cellar.user_cellar_id
    AND uc.user_id = auth.uid()
    AND uc.role IN ('owner', 'co_owner')
  )
);

-- Changer cellar_invitation.role de text à cellar_role enum
ALTER TABLE cellar_invitation 
DROP CONSTRAINT IF EXISTS cellar_invitation_role_check;

-- Retirer le défaut avant de changer le type
ALTER TABLE cellar_invitation 
ALTER COLUMN role DROP DEFAULT;

-- Changer le type de la colonne
ALTER TABLE cellar_invitation 
ALTER COLUMN role TYPE cellar_role USING role::cellar_role;

-- Remettre le défaut avec le bon type
ALTER TABLE cellar_invitation 
ALTER COLUMN role SET DEFAULT 'admin'::cellar_role;