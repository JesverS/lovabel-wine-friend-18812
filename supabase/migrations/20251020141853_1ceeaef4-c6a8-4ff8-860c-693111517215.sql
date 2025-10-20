-- Drop existing SELECT policy on cellar
DROP POLICY IF EXISTS "Utilisateurs peuvent voir leurs caves" ON public.cellar;

-- Create comprehensive SELECT policy for cellar
-- Users can see:
-- 1. Cellars they own (via user_cellar)
-- 2. Public cellars (is_public = true)
-- 3. Seller cellars (is_seller = true)
CREATE POLICY "Utilisateurs peuvent voir caves accessibles"
ON public.cellar
FOR SELECT
TO authenticated
USING (
  -- Own cellars via user_cellar relationship
  EXISTS (
    SELECT 1
    FROM public.user_cellar
    WHERE user_cellar.user_cellar_id = cellar.id
    AND user_cellar.user_id = auth.uid()
  )
  OR
  -- Public cellars
  is_public = true
  OR
  -- Seller cellars (for the cavistes page)
  is_seller = true
);