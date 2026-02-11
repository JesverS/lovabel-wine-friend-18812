
-- 1. Nouvelle politique SELECT sur user_wine_notice pour visibilité selon profil
CREATE POLICY "Degustations visibles selon confidentialite profil"
ON user_wine_notice FOR SELECT TO authenticated
USING (can_view_profile_content(auth.uid(), user_id));

-- 2. Nouvelle politique SELECT sur user_wine_notice_cellar pour visibilité selon profil
CREATE POLICY "Liens cellar visibles selon confidentialite profil"
ON user_wine_notice_cellar FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_wine_notice uwn
    WHERE uwn.id = user_wine_notice_cellar.user_wine_notice_id
    AND can_view_profile_content(auth.uid(), uwn.user_id)
  )
);

-- 3. Nouvelle politique SELECT sur user_wine_notice_event pour visibilité selon profil
CREATE POLICY "Liens event visibles selon confidentialite profil"
ON user_wine_notice_event FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_wine_notice uwn
    WHERE uwn.id = user_wine_notice_event.user_wine_notice_id
    AND can_view_profile_content(auth.uid(), uwn.user_id)
  )
);

-- 4. DROP et recréer le RPC avec contrôle d'accès
DROP FUNCTION IF EXISTS get_user_tastings_with_location(uuid, text);

CREATE FUNCTION get_user_tastings_with_location(p_user_id uuid, p_source_filter text DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  wine_id uuid,
  wine_name text,
  wine_year integer,
  domain_name text,
  created_at timestamptz,
  latitude double precision,
  longitude double precision,
  source_type text,
  source_name text,
  source_id uuid,
  liked integer,
  label_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que le viewer a le droit de voir le contenu du profil
  IF NOT can_view_profile_content(auth.uid(), p_user_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH notice_events AS (
    SELECT ne.user_wine_notice_id, e.id as event_id, e.name as event_name, 
           e.latitude as event_lat, e.longitude as event_lng
    FROM user_wine_notice_event ne
    JOIN event e ON e.id = ne.event_id
  ),
  notice_cellars AS (
    SELECT nc.user_wine_notice_id, c.id as cellar_id, c.name as cellar_name,
           c.latitude as cellar_lat, c.longitude as cellar_lng
    FROM user_wine_notice_cellar nc
    JOIN cellar c ON c.id = nc.cellar_id
  )
  SELECT 
    uwn.id,
    uwn.wine_id,
    w.name::text as wine_name,
    w.year as wine_year,
    d.name::text as domain_name,
    uwn.created_at,
    COALESCE(ne.event_lat, nc.cellar_lat, uwn.latitude) as latitude,
    COALESCE(ne.event_lng, nc.cellar_lng, uwn.longitude) as longitude,
    CASE 
      WHEN ne.event_id IS NOT NULL THEN 'event'
      WHEN nc.cellar_id IS NOT NULL THEN 'cellar'
      WHEN uwn.spontaneous = true THEN 'spontaneous'
      ELSE 'unknown'
    END::text as source_type,
    COALESCE(ne.event_name, nc.cellar_name, 'Lieu spontané')::text as source_name,
    COALESCE(ne.event_id, nc.cellar_id)::uuid as source_id,
    uwn.liked,
    w.label_url::text as label_url
  FROM user_wine_notice uwn
  JOIN wine w ON w.id = uwn.wine_id
  JOIN domain d ON d.id = w.domain_id
  LEFT JOIN notice_events ne ON ne.user_wine_notice_id = uwn.id
  LEFT JOIN notice_cellars nc ON nc.user_wine_notice_id = uwn.id
  WHERE uwn.user_id = p_user_id
    AND (
      COALESCE(ne.event_lat, nc.cellar_lat, uwn.latitude) IS NOT NULL
      AND COALESCE(ne.event_lng, nc.cellar_lng, uwn.longitude) IS NOT NULL
    )
    AND (p_source_filter IS NULL OR 
         (p_source_filter = 'event' AND ne.event_id IS NOT NULL) OR
         (p_source_filter = 'cellar' AND nc.cellar_id IS NOT NULL) OR
         (p_source_filter = 'spontaneous' AND uwn.spontaneous = true))
  ORDER BY uwn.created_at DESC;
END;
$$;
