-- Phase 1 - Étape 2: Fonctions SQL helper pour la progression des leçons

-- Fonction pour obtenir les leçons accessibles par un utilisateur
CREATE OR REPLACE FUNCTION get_user_accessible_lessons(p_user_id uuid)
RETURNS TABLE (
  lesson_id bigint,
  course_id bigint,
  lesson_number integer,
  title text,
  estimated_time text,
  global_order integer,
  is_unlocked boolean,
  is_completed boolean,
  unlocked_at timestamp with time zone,
  completed_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id as lesson_id,
    l.course_id,
    l.lesson_number,
    l.title,
    l.estimated_time,
    l.global_order,
    CASE 
      WHEN ulu.lesson_id IS NOT NULL THEN true
      ELSE false
    END as is_unlocked,
    CASE 
      WHEN lc.lesson_id IS NOT NULL THEN true
      ELSE false
    END as is_completed,
    ulu.unlocked_at,
    lc.completed_at
  FROM lessons l
  LEFT JOIN user_lesson_unlock ulu ON ulu.lesson_id = l.id AND ulu.user_id = p_user_id
  LEFT JOIN lesson_completion lc ON lc.lesson_id = l.id AND lc.user_id = p_user_id
  ORDER BY l.global_order;
END;
$$;

-- Fonction pour obtenir les slots de leçons hebdomadaires disponibles
CREATE OR REPLACE FUNCTION get_weekly_lesson_slots(p_user_id uuid)
RETURNS TABLE (
  week_number integer,
  total_completions integer,
  available_unlocks integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_weeks_since_first_completion integer;
  v_total_weeks integer;
BEGIN
  -- Calculer le nombre de semaines depuis la première complétion
  SELECT 
    COALESCE(
      FLOOR(EXTRACT(EPOCH FROM (NOW() - MIN(completed_at))) / (7 * 24 * 60 * 60))::integer,
      0
    )
  INTO v_weeks_since_first_completion
  FROM lesson_completion
  WHERE user_id = p_user_id AND counted_for_unlock = true;

  v_total_weeks := GREATEST(v_weeks_since_first_completion, 0);

  RETURN QUERY
  WITH weekly_data AS (
    SELECT 
      generate_series(0, v_total_weeks) as week_num
  ),
  completions_per_week AS (
    SELECT 
      FLOOR(EXTRACT(EPOCH FROM (completed_at - (
        SELECT MIN(completed_at) 
        FROM lesson_completion 
        WHERE user_id = p_user_id AND counted_for_unlock = true
      ))) / (7 * 24 * 60 * 60))::integer as week_num,
      COUNT(*) as completions
    FROM lesson_completion
    WHERE user_id = p_user_id 
      AND counted_for_unlock = true
    GROUP BY week_num
  )
  SELECT 
    wd.week_num::integer,
    COALESCE(cpw.completions, 0)::integer as total_completions,
    GREATEST(0, 3 - COALESCE(cpw.completions, 0))::integer as available_unlocks
  FROM weekly_data wd
  LEFT JOIN completions_per_week cpw ON wd.week_num = cpw.week_num
  ORDER BY wd.week_num;
END;
$$;

-- Fonction pour vérifier si un utilisateur peut déverrouiller une nouvelle leçon
CREATE OR REPLACE FUNCTION can_user_unlock_lesson(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unlocks_available integer;
BEGIN
  -- Obtenir le nombre de déverrouillages disponibles cette semaine
  SELECT available_unlocks INTO v_unlocks_available
  FROM get_weekly_lesson_slots(p_user_id)
  ORDER BY week_number DESC
  LIMIT 1;

  RETURN COALESCE(v_unlocks_available, 0) > 0;
END;
$$;

-- Fonction pour déverrouiller la prochaine leçon pour un utilisateur
CREATE OR REPLACE FUNCTION unlock_next_lesson(p_user_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_lesson_id bigint;
  v_can_unlock boolean;
BEGIN
  -- Vérifier si l'utilisateur peut déverrouiller
  v_can_unlock := can_user_unlock_lesson(p_user_id);
  
  IF NOT v_can_unlock THEN
    RAISE EXCEPTION 'No unlock slots available this week';
  END IF;

  -- Trouver la prochaine leçon non déverrouillée
  SELECT l.id INTO v_next_lesson_id
  FROM lessons l
  LEFT JOIN user_lesson_unlock ulu ON ulu.lesson_id = l.id AND ulu.user_id = p_user_id
  WHERE ulu.lesson_id IS NULL
  ORDER BY l.global_order
  LIMIT 1;

  IF v_next_lesson_id IS NULL THEN
    RAISE EXCEPTION 'No more lessons to unlock';
  END IF;

  -- Déverrouiller la leçon
  INSERT INTO user_lesson_unlock (user_id, lesson_id, unlocked_at)
  VALUES (p_user_id, v_next_lesson_id, NOW())
  ON CONFLICT (user_id, lesson_id) DO NOTHING;

  RETURN v_next_lesson_id;
END;
$$;