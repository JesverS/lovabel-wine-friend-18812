-- =============================================
-- SYSTÈME DE BADGES COMPLET
-- =============================================

-- 1. Table des définitions de badges
CREATE TABLE public.badge_definition (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  category text NOT NULL CHECK (category IN ('learning', 'social', 'events', 'collection')),
  tier text NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  criteria jsonb NOT NULL,
  xp_reward integer DEFAULT 0,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 2. Table des badges utilisateur
CREATE TABLE public.user_badge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.badge_definition(id) ON DELETE CASCADE,
  unlocked_at timestamptz DEFAULT now(),
  notified boolean DEFAULT false,
  UNIQUE(user_id, badge_id)
);

-- 3. Activer RLS
ALTER TABLE public.badge_definition ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badge ENABLE ROW LEVEL SECURITY;

-- 4. Policies pour badge_definition (lecture publique)
CREATE POLICY "Badges visibles par tous" ON public.badge_definition
  FOR SELECT USING (true);

CREATE POLICY "Super admins gèrent badges" ON public.badge_definition
  FOR ALL USING (has_role(auth.uid(), 'super_admin'));

-- 5. Policies pour user_badge
CREATE POLICY "Badges utilisateur visibles par tous" ON public.user_badge
  FOR SELECT USING (true);

CREATE POLICY "Système peut attribuer badges" ON public.user_badge
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Utilisateurs mettent à jour leurs badges" ON public.user_badge
  FOR UPDATE USING (auth.uid() = user_id);

-- 6. Insérer les définitions de badges
INSERT INTO public.badge_definition (code, name, description, icon, category, tier, criteria, xp_reward, sort_order) VALUES
-- Catégorie Apprentissage
('first_lesson', 'Première Leçon', 'Terminer votre première leçon', '📚', 'learning', 'bronze', '{"type": "lesson_count", "value": 1}', 10, 1),
('student_5', 'Étudiant Appliqué', 'Terminer 5 leçons', '🎯', 'learning', 'silver', '{"type": "lesson_count", "value": 5}', 25, 2),
('expert_10', 'Expert en Herbe', 'Terminer 10 leçons', '⭐', 'learning', 'gold', '{"type": "lesson_count", "value": 10}', 50, 3),
('wine_master', 'Maître du Vin', 'Terminer toutes les leçons', '🏆', 'learning', 'platinum', '{"type": "all_lessons", "value": true}', 100, 4),
('xp_100', 'XP Débutant', 'Accumuler 100 XP', '✨', 'learning', 'bronze', '{"type": "xp", "value": 100}', 5, 5),
('xp_500', 'XP Confirmé', 'Accumuler 500 XP', '💫', 'learning', 'silver', '{"type": "xp", "value": 500}', 15, 6),
('xp_1000', 'XP Expert', 'Accumuler 1000 XP', '🌟', 'learning', 'gold', '{"type": "xp", "value": 1000}', 30, 7),
('level_5', 'Niveau 5', 'Atteindre le niveau 5', '🎖️', 'learning', 'silver', '{"type": "level", "value": 5}', 20, 8),
('level_10', 'Niveau 10', 'Atteindre le niveau 10', '🏅', 'learning', 'gold', '{"type": "level", "value": 10}', 40, 9),

-- Catégorie Social
('first_post', 'Premier Post', 'Publier votre premier post', '💬', 'social', 'bronze', '{"type": "post_count", "value": 1}', 10, 10),
('active_poster', 'Contributeur Actif', 'Publier 10 posts', '📝', 'social', 'silver', '{"type": "post_count", "value": 10}', 25, 11),
('influencer', 'Influenceur', 'Publier 50 posts', '🎙️', 'social', 'gold', '{"type": "post_count", "value": 50}', 50, 12),
('first_like_received', 'Premier Like', 'Recevoir votre premier like', '❤️', 'social', 'bronze', '{"type": "likes_received", "value": 1}', 5, 13),
('popular', 'Populaire', 'Recevoir 50 likes', '💕', 'social', 'silver', '{"type": "likes_received", "value": 50}', 20, 14),
('star', 'Star', 'Recevoir 100 likes', '🌟', 'social', 'gold', '{"type": "likes_received", "value": 100}', 40, 15),
('first_comment', 'Premier Commentaire', 'Écrire votre premier commentaire', '💭', 'social', 'bronze', '{"type": "comment_count", "value": 1}', 5, 16),
('communicator', 'Communicateur', 'Écrire 20 commentaires', '🗣️', 'social', 'silver', '{"type": "comment_count", "value": 20}', 20, 17),
('first_follower', 'Premier Abonné', 'Avoir votre premier abonné', '👤', 'social', 'bronze', '{"type": "followers", "value": 1}', 10, 18),
('famous', 'Célèbre', 'Avoir 50 abonnés', '👥', 'social', 'silver', '{"type": "followers", "value": 50}', 30, 19),
('wine_influencer', 'Influenceur Vin', 'Avoir 100 abonnés', '🍷', 'social', 'gold', '{"type": "followers", "value": 100}', 50, 20),

-- Catégorie Événements
('first_event', 'Première Participation', 'Participer à votre premier événement', '🎉', 'events', 'bronze', '{"type": "events_joined", "value": 1}', 15, 21),
('event_lover', 'Amateur d''Événements', 'Participer à 5 événements', '🎊', 'events', 'silver', '{"type": "events_joined", "value": 5}', 30, 22),
('event_passionate', 'Passionné', 'Participer à 15 événements', '🌟', 'events', 'gold', '{"type": "events_joined", "value": 15}', 50, 23),
('first_organizer', 'Organisateur Débutant', 'Organiser votre premier événement', '📋', 'events', 'bronze', '{"type": "events_organized", "value": 1}', 20, 24),
('pro_organizer', 'Organisateur Pro', 'Organiser 5 événements', '🎪', 'events', 'silver', '{"type": "events_organized", "value": 5}', 40, 25),

-- Catégorie Collection
('first_cellar', 'Première Cave', 'Créer votre première cave', '🏠', 'collection', 'bronze', '{"type": "cellar_count", "value": 1}', 15, 26),
('collector', 'Collectionneur', 'Créer 3 caves', '🏰', 'collection', 'silver', '{"type": "cellar_count", "value": 3}', 30, 27),
('first_favorite', 'Premier Favori', 'Ajouter votre premier vin en favoris', '⭐', 'collection', 'bronze', '{"type": "favorite_count", "value": 1}', 5, 28),
('connoisseur', 'Connaisseur', 'Avoir 20 vins en favoris', '🍇', 'collection', 'silver', '{"type": "favorite_count", "value": 20}', 25, 29),
('encyclopedia', 'Encyclopédie Vivante', 'Avoir 50 vins en favoris', '📖', 'collection', 'gold', '{"type": "favorite_count", "value": 50}', 50, 30);

-- 7. Fonction principale de vérification et attribution des badges
CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id uuid)
RETURNS TABLE(badge_code text, badge_name text, badge_icon text, xp_earned integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    v_criteria_value := (v_badge.criteria->>'value')::integer;
    v_should_award := false;

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
      INSERT INTO user_badge (user_id, badge_id) VALUES (p_user_id, v_badge.id);
      
      -- Ajouter XP récompense
      IF v_badge.xp_reward > 0 THEN
        UPDATE user_profiles SET xp = xp + v_badge.xp_reward WHERE id = p_user_id;
      END IF;

      -- Créer notification
      PERFORM create_notification(
        p_user_id,
        'badge_unlocked',
        'Nouveau badge débloqué !',
        'Vous avez obtenu le badge "' || v_badge.name || '"',
        jsonb_build_object('badge_code', v_badge.code, 'badge_name', v_badge.name, 'badge_icon', v_badge.icon, 'xp_reward', v_badge.xp_reward)
      );

      RETURN QUERY SELECT v_badge.code, v_badge.name, v_badge.icon, v_badge.xp_reward;
    END IF;
  END LOOP;
END;
$$;

-- 8. Fonction trigger pour vérifier les badges
CREATE OR REPLACE FUNCTION public.trigger_check_badges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Déterminer l'user_id selon la table
  IF TG_TABLE_NAME = 'lesson_completion' THEN
    v_user_id := NEW.user_id;
  ELSIF TG_TABLE_NAME = 'user_profiles' THEN
    v_user_id := NEW.id;
  ELSIF TG_TABLE_NAME = 'post' THEN
    v_user_id := NEW.user_id;
  ELSIF TG_TABLE_NAME = 'post_like' THEN
    SELECT user_id INTO v_user_id FROM post WHERE id = NEW.post_id;
  ELSIF TG_TABLE_NAME = 'post_comment' THEN
    v_user_id := NEW.user_id;
  ELSIF TG_TABLE_NAME = 'user_follow' THEN
    v_user_id := NEW.following_id;
  ELSIF TG_TABLE_NAME = 'user_event' THEN
    v_user_id := NEW.user_id;
  ELSIF TG_TABLE_NAME = 'user_cellar' THEN
    v_user_id := NEW.user_id;
  ELSIF TG_TABLE_NAME = 'user_favorite' THEN
    v_user_id := NEW.user_id;
  ELSE
    RETURN NEW;
  END IF;

  -- Vérifier et attribuer les badges
  IF v_user_id IS NOT NULL THEN
    PERFORM check_and_award_badges(v_user_id);
  END IF;

  RETURN NEW;
END;
$$;

-- 9. Créer les triggers sur les tables pertinentes
CREATE TRIGGER check_badges_on_lesson
  AFTER INSERT ON public.lesson_completion
  FOR EACH ROW EXECUTE FUNCTION trigger_check_badges();

CREATE TRIGGER check_badges_on_profile_update
  AFTER UPDATE OF xp, level ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_check_badges();

CREATE TRIGGER check_badges_on_post
  AFTER INSERT ON public.post
  FOR EACH ROW EXECUTE FUNCTION trigger_check_badges();

CREATE TRIGGER check_badges_on_like
  AFTER INSERT ON public.post_like
  FOR EACH ROW EXECUTE FUNCTION trigger_check_badges();

CREATE TRIGGER check_badges_on_comment
  AFTER INSERT ON public.post_comment
  FOR EACH ROW EXECUTE FUNCTION trigger_check_badges();

CREATE TRIGGER check_badges_on_follow
  AFTER INSERT OR UPDATE ON public.user_follow
  FOR EACH ROW 
  WHEN (NEW.status = 'accepted')
  EXECUTE FUNCTION trigger_check_badges();

CREATE TRIGGER check_badges_on_event
  AFTER INSERT ON public.user_event
  FOR EACH ROW EXECUTE FUNCTION trigger_check_badges();

CREATE TRIGGER check_badges_on_cellar
  AFTER INSERT ON public.user_cellar
  FOR EACH ROW EXECUTE FUNCTION trigger_check_badges();

CREATE TRIGGER check_badges_on_favorite
  AFTER INSERT ON public.user_favorite
  FOR EACH ROW EXECUTE FUNCTION trigger_check_badges();

-- 10. Index pour performances
CREATE INDEX idx_user_badge_user_id ON public.user_badge(user_id);
CREATE INDEX idx_user_badge_unlocked_at ON public.user_badge(unlocked_at DESC);
CREATE INDEX idx_badge_definition_category ON public.badge_definition(category);
CREATE INDEX idx_badge_definition_sort ON public.badge_definition(sort_order);