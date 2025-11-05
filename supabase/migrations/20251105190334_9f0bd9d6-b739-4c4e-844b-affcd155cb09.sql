-- Fonction pour créer une cave et la relation user_cellar atomiquement
CREATE OR REPLACE FUNCTION create_cellar_with_owner(
  p_name TEXT,
  p_description TEXT,
  p_location TEXT,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_is_public BOOLEAN,
  p_is_seller BOOLEAN,
  p_logo_url TEXT,
  p_banner_url TEXT
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cellar_id UUID;
BEGIN
  -- Créer la cave
  INSERT INTO cellar (
    name,
    description,
    location,
    latitude,
    longitude,
    is_public,
    is_seller,
    logo_url,
    banner_url
  ) VALUES (
    p_name,
    p_description,
    p_location,
    p_latitude,
    p_longitude,
    p_is_public,
    p_is_seller,
    p_logo_url,
    p_banner_url
  )
  RETURNING id INTO v_cellar_id;

  -- Créer immédiatement la relation user_cellar
  INSERT INTO user_cellar (
    user_id,
    user_cellar_id,
    role
  ) VALUES (
    auth.uid(),
    v_cellar_id,
    'owner'
  );

  RETURN v_cellar_id;
END;
$$;