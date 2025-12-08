-- Ajouter les colonnes téléphone et email de contact pour les événements
ALTER TABLE public.event 
ADD COLUMN IF NOT EXISTS contact_phone text,
ADD COLUMN IF NOT EXISTS contact_email text;

-- Commentaires pour documentation
COMMENT ON COLUMN public.event.contact_phone IS 'Numéro de téléphone de contact pour l''événement (visible uniquement pour les participants avec accès)';
COMMENT ON COLUMN public.event.contact_email IS 'Email de contact pour l''événement (visible uniquement pour les participants avec accès)';