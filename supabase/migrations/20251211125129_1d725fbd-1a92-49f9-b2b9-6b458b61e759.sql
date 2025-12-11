-- Supprimer l'ancienne contrainte
ALTER TABLE public.event_payment 
DROP CONSTRAINT IF EXISTS event_payment_status_check;

-- Créer la nouvelle contrainte avec 'expired'
ALTER TABLE public.event_payment 
ADD CONSTRAINT event_payment_status_check 
CHECK (status = ANY (ARRAY['pending', 'completed', 'failed', 'refunded', 'expired']));