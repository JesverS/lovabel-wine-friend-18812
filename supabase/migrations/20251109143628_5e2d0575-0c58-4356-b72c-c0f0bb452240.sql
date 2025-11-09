-- Supprimer l'ancienne politique
DROP POLICY IF EXISTS "Utilisateurs accèdent au contenu de leurs caves" ON cellar_wine;

-- Créer une politique pour SELECT accessible à TOUS (même non connectés)
CREATE POLICY "Tout le monde peut voir vins des caves accessibles"
ON cellar_wine
FOR SELECT
USING (
  -- L'utilisateur est propriétaire de la cave
  EXISTS (
    SELECT 1 FROM user_cellar
    WHERE user_cellar.user_cellar_id = cellar_wine.cellar_id
    AND user_cellar.user_id = auth.uid()
  )
  OR
  -- La cave est publique ou est un vendeur (accessible même sans connexion)
  EXISTS (
    SELECT 1 FROM cellar
    WHERE cellar.id = cellar_wine.cellar_id
    AND (cellar.is_public = true OR cellar.is_seller = true)
  )
);

-- Créer une politique pour INSERT/UPDATE/DELETE (propriétaires authentifiés uniquement)
CREATE POLICY "Propriétaires gèrent leurs vins"
ON cellar_wine
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_cellar
    WHERE user_cellar.user_cellar_id = cellar_wine.cellar_id
    AND user_cellar.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_cellar
    WHERE user_cellar.user_cellar_id = cellar_wine.cellar_id
    AND user_cellar.user_id = auth.uid()
  )
);