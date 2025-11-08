-- Corriger la policy INSERT sur user_wine_notice_event
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON user_wine_notice_event;

CREATE POLICY "Utilisateurs créent leurs liens notices-événements"
ON user_wine_notice_event
FOR INSERT
WITH CHECK (
  user_owns_wine_notice(auth.uid(), user_wine_notice_id)
);

-- Créer une fonction pour l'upsert transactionnel
CREATE OR REPLACE FUNCTION upsert_wine_notice_with_event(
  p_user_id uuid,
  p_wine_id uuid,
  p_event_id uuid,
  p_liked smallint,
  p_details jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notice_id uuid;
BEGIN
  -- Upsert dans user_wine_notice et récupérer l'id
  INSERT INTO user_wine_notice (user_id, wine_id, liked, details)
  VALUES (p_user_id, p_wine_id, p_liked, p_details)
  ON CONFLICT (user_id, wine_id)
  DO UPDATE SET
    liked = EXCLUDED.liked,
    details = EXCLUDED.details,
    updated_at = now()
  RETURNING id INTO v_notice_id;

  -- Insérer le lien avec l'événement (s'il n'existe pas déjà)
  INSERT INTO user_wine_notice_event (user_wine_notice_id, event_id)
  VALUES (v_notice_id, p_event_id)
  ON CONFLICT (user_wine_notice_id, event_id) DO NOTHING;

  RETURN v_notice_id;
END;
$$;