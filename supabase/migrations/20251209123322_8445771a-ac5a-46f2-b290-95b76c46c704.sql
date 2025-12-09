-- 1. Ajouter la colonne confidential_email
ALTER TABLE event 
ADD COLUMN IF NOT EXISTS confidential_email boolean DEFAULT false;

-- 2. Créer la VIEW event_public_list pour les événements publics
-- Ne retourne QUE les événements publics avec les champs conditionnellement masqués
CREATE OR REPLACE VIEW public.event_public_list AS
SELECT 
  id,
  slug,
  name,
  description,
  start_date,
  end_date,
  city,
  banner_url,
  access_type,
  price,
  currency,
  max_participants,
  category,
  -- Champs conditionnellement masqués selon les flags de confidentialité
  CASE WHEN NOT COALESCE(confidential_address, false) THEN address ELSE NULL END AS address,
  CASE WHEN NOT COALESCE(confidential_phone, false) THEN contact_phone ELSE NULL END AS contact_phone,
  CASE WHEN NOT COALESCE(confidential_email, false) THEN contact_email ELSE NULL END AS contact_email
FROM event
WHERE is_public = true;

-- 3. Accorder l'accès en lecture à tous (authentifiés et anonymes)
GRANT SELECT ON public.event_public_list TO anon, authenticated;

-- 4. Supprimer l'ancienne policy SELECT sur event
DROP POLICY IF EXISTS "Utilisateurs peuvent voir événements accessibles" ON event;

-- 5. Nouvelle policy SELECT : Seulement les membres/organisateurs peuvent SELECT directement sur event
-- Les événements publics passent par la VIEW event_public_list
CREATE POLICY "Membres et organisateurs voient events" ON event
FOR SELECT USING (
  -- Organisateur de l'événement
  auth.uid() = organizer_id
  OR 
  -- Membre de l'événement (inscrit dans user_event)
  EXISTS (
    SELECT 1 FROM user_event 
    WHERE user_event.event_id = event.id 
    AND user_event.user_id = auth.uid()
  )
);