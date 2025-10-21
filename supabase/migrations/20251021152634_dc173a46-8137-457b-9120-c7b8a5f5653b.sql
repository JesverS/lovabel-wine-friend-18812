-- Fix domain bucket storage policies to allow uploads with domain_id path

-- Drop existing policies
DROP POLICY IF EXISTS "Utilisateurs peuvent uploader logos domaines" ON storage.objects;
DROP POLICY IF EXISTS "Utilisateurs peuvent modifier leurs logos domaines" ON storage.objects;
DROP POLICY IF EXISTS "Utilisateurs peuvent supprimer leurs logos domaines" ON storage.objects;

-- Allow authenticated users to upload to domain bucket (they will be linked via user_domain table)
CREATE POLICY "Utilisateurs peuvent uploader logos domaines"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'domain');

-- Allow public read access to domain logos (unchanged)
-- Policy already exists: "Logos domaines publiquement accessibles"

-- Allow users to update domain logos if they own the domain
CREATE POLICY "Utilisateurs peuvent modifier logos domaines"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'domain' 
  AND EXISTS (
    SELECT 1 FROM public.user_domain
    WHERE user_domain.user_id = auth.uid()
    AND user_domain.domain_id::text = (storage.foldername(name))[1]
  )
);

-- Allow users to delete domain logos if they own the domain
CREATE POLICY "Utilisateurs peuvent supprimer logos domaines"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'domain'
  AND EXISTS (
    SELECT 1 FROM public.user_domain
    WHERE user_domain.user_id = auth.uid()
    AND user_domain.domain_id::text = (storage.foldername(name))[1]
  )
);