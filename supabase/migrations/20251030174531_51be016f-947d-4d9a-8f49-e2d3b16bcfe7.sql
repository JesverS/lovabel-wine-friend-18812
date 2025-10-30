-- Enable RLS on lessons table
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access to lessons
CREATE POLICY "Leçons publiquement lisibles"
ON public.lessons
FOR SELECT
USING (true);