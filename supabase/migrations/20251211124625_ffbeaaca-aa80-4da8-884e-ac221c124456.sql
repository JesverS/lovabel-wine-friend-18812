-- Fonction atomique pour réserver une place d'événement
-- Utilise FOR UPDATE pour verrouiller et éviter les race conditions
CREATE OR REPLACE FUNCTION public.reserve_event_spot(
  p_event_id uuid,
  p_user_id uuid,
  p_stripe_session_id text,
  p_amount numeric,
  p_currency text DEFAULT 'EUR'
)
RETURNS TABLE(success boolean, error_message text, payment_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_max_participants integer;
  v_confirmed_count integer;
  v_pending_count integer;
  v_total_reserved integer;
  v_payment_id uuid;
BEGIN
  -- Verrouiller la ligne de l'événement pour éviter les race conditions
  SELECT max_participants INTO v_max_participants
  FROM event
  WHERE id = p_event_id
  FOR UPDATE;

  -- Si pas de limite, on peut toujours réserver
  IF v_max_participants IS NULL THEN
    INSERT INTO event_payment (
      event_id,
      user_id,
      amount,
      currency,
      status,
      stripe_session_id,
      expires_at
    ) VALUES (
      p_event_id,
      p_user_id,
      p_amount,
      p_currency,
      'pending',
      p_stripe_session_id,
      NOW() + INTERVAL '30 minutes'
    )
    RETURNING id INTO v_payment_id;

    RETURN QUERY SELECT true, NULL::text, v_payment_id;
    RETURN;
  END IF;

  -- Compter les participants confirmés
  SELECT COUNT(*) INTO v_confirmed_count
  FROM user_event
  WHERE event_id = p_event_id;

  -- Compter les paiements pending non expirés
  SELECT COUNT(*) INTO v_pending_count
  FROM event_payment
  WHERE event_id = p_event_id
    AND status = 'pending'
    AND expires_at > NOW();

  v_total_reserved := v_confirmed_count + v_pending_count;

  -- Vérifier s'il reste des places
  IF v_total_reserved >= v_max_participants THEN
    RETURN QUERY SELECT false, 'L''événement est complet'::text, NULL::uuid;
    RETURN;
  END IF;

  -- Insérer le paiement (place réservée)
  INSERT INTO event_payment (
    event_id,
    user_id,
    amount,
    currency,
    status,
    stripe_session_id,
    expires_at
  ) VALUES (
    p_event_id,
    p_user_id,
    p_amount,
    p_currency,
    'pending',
    p_stripe_session_id,
    NOW() + INTERVAL '30 minutes'
  )
  RETURNING id INTO v_payment_id;

  RETURN QUERY SELECT true, NULL::text, v_payment_id;
END;
$$;