-- Supprimer l'ancienne fonction check_and_award_badges (retourne TABLE)
DROP FUNCTION IF EXISTS public.check_and_award_badges(uuid);

-- Recréer la fonction recalculate_user_level (au cas où pas créée)
CREATE OR REPLACE FUNCTION public.recalculate_user_level(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_xp integer;
  v_level integer;
  v_xp_needed integer;
  v_new_level integer;
  v_remaining_xp integer;
BEGIN
  -- Récupérer XP et niveau actuels
  SELECT COALESCE(xp, 0), COALESCE(level, 1) 
  INTO v_xp, v_level 
  FROM user_profiles 
  WHERE id = p_user_id;

  -- Si utilisateur non trouvé, retourner 1
  IF v_level IS NULL THEN
    RETURN 1;
  END IF;

  v_new_level := v_level;
  v_remaining_xp := v_xp;
  v_xp_needed := ROUND(60 * POWER(v_new_level, 1.4));

  -- Boucle de passage de niveau (gère plusieurs niveaux d'un coup)
  WHILE v_remaining_xp >= v_xp_needed LOOP
    v_remaining_xp := v_remaining_xp - v_xp_needed;
    v_new_level := v_new_level + 1;
    v_xp_needed := ROUND(60 * POWER(v_new_level, 1.4));
  END LOOP;

  -- Mettre à jour si le niveau a changé
  IF v_new_level > v_level THEN
    UPDATE user_profiles 
    SET xp = v_remaining_xp, 
        level = v_new_level,
        updated_at = now()
    WHERE id = p_user_id;
    
    -- Notification de passage de niveau
    PERFORM create_notification(
      p_user_id,
      'level_up',
      'Niveau supérieur !',
      'Félicitations ! Vous êtes passé au niveau ' || v_new_level,
      jsonb_build_object('old_level', v_level, 'new_level', v_new_level)
    );
  END IF;

  RETURN v_new_level;
END;
$$;

-- Recréer check_and_award_badges avec recalcul de niveau et retour TABLE (identique à l'existant)
CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id uuid)
RETURNS TABLE(badge_code text, badge_name text, badge_icon text, xp_earned integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lesson_count integer;
  v_total_lessons integer;
  v_xp integer;
  v_level integer;
  v_post_count integer;
  v_likes_received integer;
  v_comment_count integer;
  v_followers integer;
  v_events_joined integer;
  v_events_organized integer;
  v_cellar_count integer;
  v_favorite_count integer;
  v_badge record;
  v_criteria_type text;
  v_criteria_value integer;
  v_should_award boolean;
BEGIN
  -- Récupérer toutes les statistiques de l'utilisateur
  SELECT COUNT(*) INTO v_lesson_count FROM lesson_completion WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO v_total_lessons FROM lessons;
  SELECT COALESCE(xp, 0), COALESCE(level, 1) INTO v_xp, v_level FROM user_profiles WHERE id = p_user_id;
  SELECT COUNT(*) INTO v_post_count FROM post WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO v_likes_received FROM post_like pl JOIN post p ON p.id = pl.post_id WHERE p.user_id = p_user_id;
  SELECT COUNT(*) INTO v_comment_count FROM post_comment WHERE user_id = p_user_id;
  SELECT COALESCE(followers_count, 0) INTO v_followers FROM user_follow_counts WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO v_events_joined FROM user_event WHERE user_id = p_user_id AND role = 'participant';
  SELECT COUNT(*) INTO v_events_organized FROM user_event WHERE user_id = p_user_id AND role = 'organizer';
  SELECT COUNT(*) INTO v_cellar_count FROM user_cellar WHERE user_id = p_user_id AND role = 'owner';
  SELECT COUNT(*) INTO v_favorite_count FROM user_favorite WHERE user_id = p_user_id;

  -- Parcourir tous les badges non encore attribués
  FOR v_badge IN 
    SELECT bd.* FROM badge_definition bd
    WHERE NOT EXISTS (
      SELECT 1 FROM user_badge ub WHERE ub.badge_id = bd.id AND ub.user_id = p_user_id
    )
  LOOP
    v_criteria_type := v_badge.criteria->>'type';
    v_should_award := false;
    
    -- Parser la valeur seulement si ce n'est pas un type booléen
    IF v_criteria_type = 'all_lessons' THEN
      v_criteria_value := 0;
    ELSE
      v_criteria_value := COALESCE((v_badge.criteria->>'value')::integer, 0);
    END IF;

    -- Vérifier les critères selon le type
    CASE v_criteria_type
      WHEN 'lesson_count' THEN v_should_award := v_lesson_count >= v_criteria_value;
      WHEN 'all_lessons' THEN v_should_award := v_lesson_count >= v_total_lessons AND v_total_lessons > 0;
      WHEN 'xp' THEN v_should_award := v_xp >= v_criteria_value;
      WHEN 'level' THEN v_should_award := v_level >= v_criteria_value;
      WHEN 'post_count' THEN v_should_award := v_post_count >= v_criteria_value;
      WHEN 'likes_received' THEN v_should_award := v_likes_received >= v_criteria_value;
      WHEN 'comment_count' THEN v_should_award := v_comment_count >= v_criteria_value;
      WHEN 'followers' THEN v_should_award := v_followers >= v_criteria_value;
      WHEN 'events_joined' THEN v_should_award := v_events_joined >= v_criteria_value;
      WHEN 'events_organized' THEN v_should_award := v_events_organized >= v_criteria_value;
      WHEN 'cellar_count' THEN v_should_award := v_cellar_count >= v_criteria_value;
      WHEN 'favorite_count' THEN v_should_award := v_favorite_count >= v_criteria_value;
      ELSE v_should_award := false;
    END CASE;

    -- Attribuer le badge si les critères sont remplis
    IF v_should_award THEN
      INSERT INTO user_badge (user_id, badge_id) 
      VALUES (p_user_id, v_badge.id)
      ON CONFLICT (user_id, badge_id) DO NOTHING;
      
      -- Ajouter XP récompense et recalculer le niveau
      IF FOUND AND v_badge.xp_reward > 0 THEN
        UPDATE user_profiles SET xp = xp + v_badge.xp_reward WHERE id = p_user_id;
        -- NOUVEAU : Recalculer le niveau après ajout d'XP
        PERFORM recalculate_user_level(p_user_id);
      END IF;

      -- Créer notification seulement si l'insert a réussi
      IF FOUND THEN
        PERFORM create_notification(
          p_user_id,
          'badge_unlocked',
          'Nouveau badge débloqué !',
          'Vous avez obtenu le badge "' || v_badge.name || '"',
          jsonb_build_object('badge_code', v_badge.code, 'badge_name', v_badge.name, 'badge_icon', v_badge.icon, 'xp_reward', v_badge.xp_reward)
        );

        RETURN QUERY SELECT v_badge.code, v_badge.name, v_badge.icon, v_badge.xp_reward;
      END IF;
    END IF;
  END LOOP;
END;
$$;