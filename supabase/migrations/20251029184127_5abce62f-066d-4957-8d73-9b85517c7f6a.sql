-- Enable RLS on courses table
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Allow public read access to courses
CREATE POLICY "Cours publiquement lisibles"
ON courses
FOR SELECT
TO public
USING (true);