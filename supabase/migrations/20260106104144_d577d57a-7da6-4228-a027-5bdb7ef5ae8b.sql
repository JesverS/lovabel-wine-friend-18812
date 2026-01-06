-- ============================================
-- 1. Système de signalement de contenu
-- ============================================

CREATE TYPE public.report_reason AS ENUM (
  'spam', 'harassment', 'inappropriate_content', 
  'misinformation', 'copyright', 'other'
);

CREATE TABLE public.content_report (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  post_id UUID REFERENCES public.post(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.post_comment(id) ON DELETE CASCADE,
  reason public.report_reason NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  CONSTRAINT report_target CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR 
    (post_id IS NULL AND comment_id IS NOT NULL)
  )
);

ALTER TABLE public.content_report ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports" ON public.content_report
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports" ON public.content_report
  FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "Super admins can manage reports" ON public.content_report
  FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- ============================================
-- 2. Système d'alertes de stock
-- ============================================

ALTER TABLE public.cellar_wine ADD COLUMN IF NOT EXISTS stock_alert_threshold INTEGER DEFAULT 3;

CREATE TABLE public.stock_alert (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cellar_id UUID REFERENCES public.cellar(id) ON DELETE CASCADE NOT NULL,
  wine_id UUID REFERENCES public.wine(id) ON DELETE CASCADE NOT NULL,
  wine_name TEXT NOT NULL,
  current_quantity INTEGER NOT NULL,
  threshold INTEGER NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.stock_alert ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cellar members can view alerts" ON public.stock_alert
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_cellar 
      WHERE user_cellar.user_cellar_id = stock_alert.cellar_id 
      AND user_cellar.user_id = auth.uid()
    )
  );

CREATE POLICY "Cellar members can update alerts" ON public.stock_alert
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_cellar 
      WHERE user_cellar.user_cellar_id = stock_alert.cellar_id 
      AND user_cellar.user_id = auth.uid()
    )
  );

CREATE POLICY "Cellar members can delete alerts" ON public.stock_alert
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_cellar 
      WHERE user_cellar.user_cellar_id = stock_alert.cellar_id 
      AND user_cellar.user_id = auth.uid()
    )
  );

-- Trigger pour créer des alertes automatiquement
CREATE OR REPLACE FUNCTION public.check_stock_alert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity <= COALESCE(NEW.stock_alert_threshold, 3) 
     AND NEW.quantity > 0 
     AND (OLD IS NULL OR OLD.quantity > COALESCE(OLD.stock_alert_threshold, 3)) THEN
    INSERT INTO public.stock_alert (cellar_id, wine_id, wine_name, current_quantity, threshold)
    SELECT 
      NEW.cellar_id, 
      NEW.wine_id,
      w.name,
      NEW.quantity, 
      COALESCE(NEW.stock_alert_threshold, 3)
    FROM public.wine w WHERE w.id = NEW.wine_id
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_stock_change
  AFTER INSERT OR UPDATE OF quantity ON public.cellar_wine
  FOR EACH ROW EXECUTE FUNCTION public.check_stock_alert();

-- ============================================
-- 3. Système de Mentions et Hashtags
-- ============================================

-- Table pour stocker les mentions (pour notifications)
CREATE TABLE public.post_mention (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.post(id) ON DELETE CASCADE NOT NULL,
  mentioned_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mentioned_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, mentioned_user_id)
);

-- Table pour les hashtags (pour recherche et trending)
CREATE TABLE public.hashtag (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag TEXT UNIQUE NOT NULL,
  usage_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table de liaison post-hashtag (pour recherche optimisée)
CREATE TABLE public.post_hashtag (
  post_id UUID REFERENCES public.post(id) ON DELETE CASCADE NOT NULL,
  hashtag_id UUID REFERENCES public.hashtag(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY(post_id, hashtag_id)
);

-- RLS policies
ALTER TABLE public.post_mention ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hashtag ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_hashtag ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire les hashtags
CREATE POLICY "Anyone can read hashtags" ON public.hashtag FOR SELECT USING (true);
CREATE POLICY "Anyone can read post_hashtag" ON public.post_hashtag FOR SELECT USING (true);
CREATE POLICY "Anyone can read post_mention" ON public.post_mention FOR SELECT USING (true);

-- Seul l'auteur du post peut créer des mentions/hashtags
CREATE POLICY "Post author can create mentions" ON public.post_mention
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.post WHERE post.id = post_id AND post.user_id = auth.uid())
  );

CREATE POLICY "Post author can create post_hashtag" ON public.post_hashtag
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.post WHERE post.id = post_id AND post.user_id = auth.uid())
  );

CREATE POLICY "Authenticated can create hashtags" ON public.hashtag
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update hashtag count" ON public.hashtag
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Trigger SQL pour les notifications de mention
CREATE OR REPLACE FUNCTION public.notify_mentioned_user()
RETURNS TRIGGER AS $$
DECLARE
  author_name TEXT;
BEGIN
  -- Récupérer le nom de l'auteur du post
  SELECT full_name INTO author_name
  FROM public.user_profiles
  WHERE id = (SELECT user_id FROM public.post WHERE id = NEW.post_id);
  
  -- Créer la notification
  INSERT INTO public.notification (user_id, type, title, message, data)
  VALUES (
    NEW.mentioned_user_id,
    'mention',
    'Vous avez été mentionné',
    COALESCE(author_name, 'Quelqu''un') || ' vous a mentionné dans un post',
    jsonb_build_object('post_id', NEW.post_id, 'mentioned_slug', NEW.mentioned_slug)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_user_mentioned
  AFTER INSERT ON public.post_mention
  FOR EACH ROW EXECUTE FUNCTION public.notify_mentioned_user();