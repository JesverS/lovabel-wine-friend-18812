-- Create storage policies for domain bucket

-- Allow authenticated users to upload files to their own domain folder
CREATE POLICY "Utilisateurs peuvent uploader logos domaines"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'domain'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access to domain logos
CREATE POLICY "Logos domaines publiquement accessibles"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'domain');

-- Allow users to update their own domain logos
CREATE POLICY "Utilisateurs peuvent modifier leurs logos domaines"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'domain'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'domain'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own domain logos
CREATE POLICY "Utilisateurs peuvent supprimer leurs logos domaines"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'domain'
  AND auth.uid()::text = (storage.foldername(name))[1]
);