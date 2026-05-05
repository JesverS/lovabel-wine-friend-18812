-- Supprimer les 3 policies trop permissives du bucket cellar
-- Les policies "Membres caves peuvent..." (avec jointure user_cellar) restent en place
DROP POLICY IF EXISTS "Utilisateurs peuvent uploader dans cellar" ON storage.objects;
DROP POLICY IF EXISTS "Utilisateurs peuvent modifier leurs fichiers cellar" ON storage.objects;
DROP POLICY IF EXISTS "Utilisateurs peuvent supprimer leurs fichiers cellar" ON storage.objects;