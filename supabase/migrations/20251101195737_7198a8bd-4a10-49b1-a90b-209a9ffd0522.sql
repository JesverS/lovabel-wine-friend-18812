-- Fix domain table contact information exposure
-- Replace the public SELECT policy with authenticated-only access

DROP POLICY IF EXISTS "Domaines publiquement lisibles" ON domain;

CREATE POLICY "Authenticated users can view domains"
ON domain
FOR SELECT
TO authenticated
USING (true);
