-- ============================================
-- 1. CELLAR : Restreindre création aux utilisateurs connectés
-- ============================================
DROP POLICY IF EXISTS "Utilisateurs peuvent créer des caves" ON cellar;
CREATE POLICY "Utilisateurs connectés peuvent créer des caves"
ON cellar FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- 2. DOMAIN : Restreindre création aux utilisateurs connectés
-- ============================================
DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent créer des domaines" ON domain;
CREATE POLICY "Utilisateurs connectés peuvent créer des domaines"
ON domain FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- 3. WINE : Restreindre création aux membres du domaine
-- ============================================
DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent créer des vins" ON wine;
CREATE POLICY "Membres du domaine peuvent créer des vins"
ON wine FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_domain
    WHERE user_domain.domain_id = wine.domain_id
    AND user_domain.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- ============================================
-- 4. USER_BADGE : Supprimer policy INSERT publique
-- (les badges sont attribués via fonction SECURITY DEFINER)
-- ============================================
DROP POLICY IF EXISTS "Système peut attribuer badges" ON user_badge;

-- ============================================
-- 5. MODE_CULTURE : Ajouter policy SELECT pour utilisateurs connectés
-- ============================================
CREATE POLICY "Lecture mode_culture pour utilisateurs connectés"
ON mode_culture FOR SELECT TO authenticated
USING (true);