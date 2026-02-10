
CREATE OR REPLACE FUNCTION public.find_or_create_wine(
  p_name text,
  p_domain_id uuid,
  p_year integer DEFAULT NULL,
  p_volume_ml integer DEFAULT NULL,
  p_price real DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_label_url text DEFAULT NULL,
  p_alcohol_percentage numeric DEFAULT NULL,
  p_type bigint DEFAULT NULL,
  p_appellation_id integer DEFAULT NULL
)
RETURNS TABLE(
  wine_id uuid,
  wine_name text,
  wine_year integer,
  wine_label_url text,
  was_created boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_existing record;
  v_new record;
  v_final_label_url text;
BEGIN
  -- Chercher un vin existant si domain_id et year sont fournis
  IF p_domain_id IS NOT NULL AND p_year IS NOT NULL THEN
    SELECT w.id, w.name, w.year, w.label_url
    INTO v_existing
    FROM wine w
    WHERE w.domain_id = p_domain_id
      AND w.year = p_year
      AND extensions.similarity(
        COALESCE(w.normalized_name, extensions.unaccent(lower(w.name))),
        extensions.unaccent(lower(p_name))
      ) > 0.88
    ORDER BY extensions.similarity(
      COALESCE(w.normalized_name, extensions.unaccent(lower(w.name))),
      extensions.unaccent(lower(p_name))
    ) DESC
    LIMIT 1;

    IF v_existing IS NOT NULL THEN
      RETURN QUERY SELECT v_existing.id, v_existing.name, v_existing.year, v_existing.label_url, false;
      RETURN;
    END IF;
  END IF;

  -- Définir l'URL de l'étiquette par défaut si non fournie
  v_final_label_url := COALESCE(p_label_url, 'https://amzutunyjouejovlrlah.supabase.co/storage/v1/object/public/domain/tmp/default.png');

  -- Pas de doublon trouvé, créer le vin
  INSERT INTO wine (name, domain_id, year, volume_ml, price, description, label_url, alcohol_percentage, type, appellation_id)
  VALUES (p_name, p_domain_id, p_year, p_volume_ml, p_price, p_description, v_final_label_url, p_alcohol_percentage, p_type, p_appellation_id)
  RETURNING id, name, year, label_url INTO v_new;

  RETURN QUERY SELECT v_new.id, v_new.name, v_new.year, v_new.label_url, true;
END;
$$;
