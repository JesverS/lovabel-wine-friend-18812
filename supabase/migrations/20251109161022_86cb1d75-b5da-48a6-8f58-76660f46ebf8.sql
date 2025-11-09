-- Activer RLS sur user_wine_notice_cellar
ALTER TABLE user_wine_notice_cellar ENABLE ROW LEVEL SECURITY;

-- Permettre aux utilisateurs de créer leurs propres entrées
CREATE POLICY "Utilisateurs créent leurs liens cellar"
ON user_wine_notice_cellar
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_wine_notice
    WHERE user_wine_notice.id = user_wine_notice_cellar.user_wine_notice_id
    AND user_wine_notice.user_id = auth.uid()
  )
);

-- Permettre aux utilisateurs de voir leurs propres entrées
CREATE POLICY "Utilisateurs voient leurs liens cellar"
ON user_wine_notice_cellar
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_wine_notice
    WHERE user_wine_notice.id = user_wine_notice_cellar.user_wine_notice_id
    AND user_wine_notice.user_id = auth.uid()
  )
);

-- Permettre aux utilisateurs de supprimer leurs propres entrées
CREATE POLICY "Utilisateurs suppriment leurs liens cellar"
ON user_wine_notice_cellar
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_wine_notice
    WHERE user_wine_notice.id = user_wine_notice_cellar.user_wine_notice_id
    AND user_wine_notice.user_id = auth.uid()
  )
);