-- Drop existing policy
DROP POLICY IF EXISTS "Utilisateurs accèdent à leurs caves" ON public.cellar;

-- Create separate policies for different operations

-- Allow authenticated users to insert new cellars
CREATE POLICY "Utilisateurs peuvent créer des caves"
ON public.cellar
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Users can view cellars they own via user_cellar
CREATE POLICY "Utilisateurs peuvent voir leurs caves"
ON public.cellar
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_cellar
    WHERE user_cellar.user_cellar_id = cellar.id
    AND user_cellar.user_id = auth.uid()
  )
);

-- Users can update cellars they own via user_cellar
CREATE POLICY "Utilisateurs peuvent modifier leurs caves"
ON public.cellar
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_cellar
    WHERE user_cellar.user_cellar_id = cellar.id
    AND user_cellar.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_cellar
    WHERE user_cellar.user_cellar_id = cellar.id
    AND user_cellar.user_id = auth.uid()
  )
);

-- Users can delete cellars they own via user_cellar
CREATE POLICY "Utilisateurs peuvent supprimer leurs caves"
ON public.cellar
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_cellar
    WHERE user_cellar.user_cellar_id = cellar.id
    AND user_cellar.user_id = auth.uid()
  )
);