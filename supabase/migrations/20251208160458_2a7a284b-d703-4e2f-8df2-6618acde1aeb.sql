-- Ajouter expires_at et refunded_at à event_payment
ALTER TABLE event_payment 
ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone DEFAULT (now() + interval '24 hours'),
ADD COLUMN IF NOT EXISTS refunded_at timestamp with time zone;

-- Index pour le cleanup des paiements expirés
CREATE INDEX IF NOT EXISTS idx_event_payment_status_expires 
ON event_payment (status, expires_at) 
WHERE status = 'pending';