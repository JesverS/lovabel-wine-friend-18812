-- Ajouter la colonne city à user_profiles si elle n'existe pas déjà
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'city'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN city text;
  END IF;
END $$;