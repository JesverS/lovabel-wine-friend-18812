-- Storage policies for cellar bucket

-- Allow authenticated users to upload files to cellar bucket
CREATE POLICY "Utilisateurs peuvent uploader dans cellar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'cellar');

-- Allow authenticated users to view files in cellar bucket
CREATE POLICY "Fichiers cellar publiquement lisibles"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'cellar');

-- Allow users to update their own cellar files
CREATE POLICY "Utilisateurs peuvent modifier leurs fichiers cellar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'cellar');

-- Allow users to delete their own cellar files
CREATE POLICY "Utilisateurs peuvent supprimer leurs fichiers cellar"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'cellar');