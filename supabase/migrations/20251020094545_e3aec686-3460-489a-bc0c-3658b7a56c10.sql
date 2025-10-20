-- Créer les politiques RLS pour le bucket 'post'

-- Permettre à tous de voir les images (bucket public)
CREATE POLICY "Les images de posts sont publiquement accessibles"
ON storage.objects
FOR SELECT
USING (bucket_id = 'post');

-- Permettre aux utilisateurs authentifiés d'uploader leurs images
CREATE POLICY "Utilisateurs peuvent uploader leurs images de posts"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'post' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Permettre aux utilisateurs de mettre à jour leurs propres images
CREATE POLICY "Utilisateurs peuvent modifier leurs images de posts"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'post' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Permettre aux utilisateurs de supprimer leurs propres images
CREATE POLICY "Utilisateurs peuvent supprimer leurs images de posts"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'post' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);