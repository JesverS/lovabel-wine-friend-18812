-- 1. Fonction pour rejoindre un événement public (avec protection race condition)
CREATE OR REPLACE FUNCTION public.join_public_event(
  p_event_id uuid,
  p_user_id uuid
)
RETURNS TABLE(success boolean, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_access_type event_access_type;
  v_max_participants integer;
  v_current_count integer;
BEGIN
  -- Verrouiller l'événement pour éviter les race conditions
  SELECT access_type, max_participants INTO v_access_type, v_max_participants
  FROM event
  WHERE id = p_event_id
  FOR UPDATE;

  -- Vérifier que l'événement existe
  IF v_access_type IS NULL THEN
    RETURN QUERY SELECT false, 'Événement introuvable'::text;
    RETURN;
  END IF;

  -- Vérifier que l'accès est public
  IF v_access_type != 'public' THEN
    RETURN QUERY SELECT false, 'Cet événement n''est pas en accès libre'::text;
    RETURN;
  END IF;

  -- Vérifier que l'utilisateur n'est pas déjà inscrit
  IF EXISTS (SELECT 1 FROM user_event WHERE event_id = p_event_id AND user_id = p_user_id) THEN
    RETURN QUERY SELECT false, 'Vous êtes déjà inscrit à cet événement'::text;
    RETURN;
  END IF;

  -- Vérifier la limite de participants si définie
  IF v_max_participants IS NOT NULL THEN
    SELECT COUNT(*) INTO v_current_count
    FROM user_event
    WHERE event_id = p_event_id;

    IF v_current_count >= v_max_participants THEN
      RETURN QUERY SELECT false, 'L''événement est complet'::text;
      RETURN;
    END IF;
  END IF;

  -- Insérer la participation
  INSERT INTO user_event (event_id, user_id, role, access_origin)
  VALUES (p_event_id, p_user_id, 'participant', 'public');

  RETURN QUERY SELECT true, NULL::text;
END;
$$;

-- 2. Table pour les demandes de remboursement
CREATE TABLE public.event_refund_request (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES event(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  payment_id uuid NOT NULL REFERENCES event_payment(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message text,
  refund_amount numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  processed_by uuid,
  rejection_reason text,
  UNIQUE(payment_id)
);

-- 3. Activer RLS
ALTER TABLE public.event_refund_request ENABLE ROW LEVEL SECURITY;

-- 4. Policies RLS
-- SELECT : Utilisateur voit ses demandes
CREATE POLICY "Utilisateurs voient leurs demandes de remboursement"
ON public.event_refund_request
FOR SELECT
USING (auth.uid() = user_id);

-- SELECT : Organisateurs voient les demandes de leur événement
CREATE POLICY "Organisateurs voient demandes remboursement événement"
ON public.event_refund_request
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_event
    WHERE user_event.event_id = event_refund_request.event_id
    AND user_event.user_id = auth.uid()
    AND user_event.role IN ('organizer', 'co_organizer')
  )
);

-- INSERT : Utilisateur peut créer une demande pour son propre paiement
CREATE POLICY "Utilisateurs créent leurs demandes de remboursement"
ON public.event_refund_request
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM event_payment
    WHERE event_payment.id = payment_id
    AND event_payment.user_id = auth.uid()
    AND event_payment.status = 'completed'
  )
);

-- UPDATE : Seuls organizer/co_organizer peuvent modifier (approuver/rejeter)
CREATE POLICY "Organisateurs traitent demandes remboursement"
ON public.event_refund_request
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_event
    WHERE user_event.event_id = event_refund_request.event_id
    AND user_event.user_id = auth.uid()
    AND user_event.role IN ('organizer', 'co_organizer')
  )
);

-- Pas de DELETE policy (historique conservé)