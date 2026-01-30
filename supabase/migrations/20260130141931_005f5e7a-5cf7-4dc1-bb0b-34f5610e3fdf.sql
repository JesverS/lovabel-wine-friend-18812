-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION public.handle_blog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Table blog_article pour le système de blog SEO
CREATE TABLE public.blog_article (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  meta_title TEXT,
  meta_description TEXT,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image TEXT,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance SEO
CREATE INDEX idx_blog_article_slug ON public.blog_article(slug);
CREATE INDEX idx_blog_article_published ON public.blog_article(is_published, published_at DESC);
CREATE INDEX idx_blog_article_category ON public.blog_article(category);

-- Enable RLS
ALTER TABLE public.blog_article ENABLE ROW LEVEL SECURITY;

-- Politique: Articles publiés visibles par tous
CREATE POLICY "Articles publiés visibles par tous" ON public.blog_article
  FOR SELECT USING (is_published = TRUE);

-- Politique: Super admins peuvent tout faire
CREATE POLICY "Super admins gèrent blog" ON public.blog_article
  FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger pour updated_at
CREATE TRIGGER update_blog_article_updated_at
  BEFORE UPDATE ON public.blog_article
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_blog_updated_at();