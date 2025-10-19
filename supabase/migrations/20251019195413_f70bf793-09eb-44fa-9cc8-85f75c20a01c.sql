-- =====================================================
-- ÉTAPE 1 : CORRECTION DE LA FONCTION HANDLE_NEW_USER
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
begin
  insert into public.user_profiles (id)
  values (new.id);
  return new;
end;
$function$;

-- =====================================================
-- ÉTAPE 2 : ACTIVATION RLS + POLITIQUES USER_PROFILES
-- =====================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Profils publiquement lisibles
CREATE POLICY "Profils publiquement lisibles" 
ON public.user_profiles 
FOR SELECT 
USING (true);

-- Utilisateurs peuvent mettre à jour leur propre profil
CREATE POLICY "Utilisateurs mettent à jour leur profil" 
ON public.user_profiles 
FOR UPDATE 
USING (id = auth.uid());

-- =====================================================
-- ÉTAPE 3 : POLITIQUES POUR LES POSTS
-- =====================================================
ALTER TABLE public.post ENABLE ROW LEVEL SECURITY;

-- Posts publiquement lisibles
CREATE POLICY "Posts publiquement lisibles" 
ON public.post 
FOR SELECT 
USING (true);

-- Utilisateurs authentifiés créent des posts
CREATE POLICY "Utilisateurs créent des posts" 
ON public.post 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Utilisateurs gèrent leurs propres posts
CREATE POLICY "Utilisateurs gèrent leurs posts" 
ON public.post 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Utilisateurs suppriment leurs posts" 
ON public.post 
FOR DELETE 
USING (auth.uid() = user_id);

-- =====================================================
-- ÉTAPE 4 : POLITIQUES POUR LES LIKES
-- =====================================================
ALTER TABLE public.post_like ENABLE ROW LEVEL SECURITY;

-- Likes publiquement lisibles
CREATE POLICY "Likes publiquement lisibles" 
ON public.post_like 
FOR SELECT 
USING (true);

-- Utilisateurs gèrent leurs propres likes
CREATE POLICY "Utilisateurs créent leurs likes" 
ON public.post_like 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Utilisateurs suppriment leurs likes" 
ON public.post_like 
FOR DELETE 
USING (auth.uid() = user_id);

-- =====================================================
-- ÉTAPE 5 : POLITIQUES POUR LES COMMENTAIRES
-- =====================================================
ALTER TABLE public.post_comment ENABLE ROW LEVEL SECURITY;

-- Commentaires publiquement lisibles
CREATE POLICY "Commentaires publiquement lisibles" 
ON public.post_comment 
FOR SELECT 
USING (true);

-- Utilisateurs authentifiés créent des commentaires
CREATE POLICY "Utilisateurs créent des commentaires" 
ON public.post_comment 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Utilisateurs gèrent leurs propres commentaires
CREATE POLICY "Utilisateurs mettent à jour leurs commentaires" 
ON public.post_comment 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Utilisateurs suppriment leurs commentaires" 
ON public.post_comment 
FOR DELETE 
USING (auth.uid() = user_id);

-- =====================================================
-- ÉTAPE 6 : POLITIQUES POUR LES FOLLOWS
-- =====================================================
ALTER TABLE public.user_follow ENABLE ROW LEVEL SECURITY;

-- Follows publiquement lisibles
CREATE POLICY "Follows publiquement lisibles" 
ON public.user_follow 
FOR SELECT 
USING (true);

-- Utilisateurs gèrent leurs propres follows
CREATE POLICY "Utilisateurs créent leurs follows" 
ON public.user_follow 
FOR INSERT 
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Utilisateurs suppriment leurs follows" 
ON public.user_follow 
FOR DELETE 
USING (auth.uid() = follower_id);

-- =====================================================
-- ÉTAPE 7 : POLITIQUES POUR LES NOTES PRIVÉES
-- =====================================================
ALTER TABLE public.user_vin_note ENABLE ROW LEVEL SECURITY;

-- Notes privées : uniquement accessibles par le propriétaire
CREATE POLICY "Utilisateurs accèdent à leurs notes" 
ON public.user_vin_note 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- ÉTAPE 8 : POLITIQUES POUR L'INVENTAIRE PRIVÉ
-- =====================================================
ALTER TABLE public.user_vin_inventory ENABLE ROW LEVEL SECURITY;

-- Inventaire privé : uniquement accessible par le propriétaire
CREATE POLICY "Utilisateurs accèdent à leur inventaire" 
ON public.user_vin_inventory 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- ÉTAPE 9 : POLITIQUES POUR LES CAVES
-- =====================================================
ALTER TABLE public.cave ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cave_vin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_cave ENABLE ROW LEVEL SECURITY;

-- Caves : accessibles via user_cave
CREATE POLICY "Utilisateurs accèdent à leurs caves" 
ON public.cave 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_cave 
    WHERE user_cave.cave_id = cave.id 
    AND user_cave.user_id = auth.uid()
  )
);

-- Contenu des caves
CREATE POLICY "Utilisateurs accèdent au contenu de leurs caves" 
ON public.cave_vin 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_cave 
    WHERE user_cave.cave_id = cave_vin.cave_id 
    AND user_cave.user_id = auth.uid()
  )
);

-- Relations user_cave
CREATE POLICY "Utilisateurs gèrent leurs relations caves" 
ON public.user_cave 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- ÉTAPE 10 : POLITIQUES POUR LES DOMAINES (LECTURE PUBLIQUE)
-- =====================================================
ALTER TABLE public.domaine ENABLE ROW LEVEL SECURITY;

-- Domaines publiquement lisibles
CREATE POLICY "Domaines publiquement lisibles" 
ON public.domaine 
FOR SELECT 
USING (true);

-- Modification réservée (à adapter selon vos besoins)
CREATE POLICY "Admin peut modifier domaines" 
ON public.domaine 
FOR ALL 
USING (false); -- Bloquer pour l'instant, à adapter avec un système de rôles

-- =====================================================
-- ÉTAPE 11 : POLITIQUES POUR LES VINS
-- =====================================================
ALTER TABLE public.vin ENABLE ROW LEVEL SECURITY;

-- Vins publiquement lisibles
CREATE POLICY "Vins publiquement lisibles" 
ON public.vin 
FOR SELECT 
USING (true);

-- Modification réservée (à adapter selon vos besoins)
CREATE POLICY "Admin peut modifier vins" 
ON public.vin 
FOR ALL 
USING (false); -- Bloquer pour l'instant, à adapter avec un système de rôles

-- =====================================================
-- ÉTAPE 12 : POLITIQUES POUR LES ÉVÉNEMENTS
-- =====================================================
ALTER TABLE public.event ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_domaine ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_domaine_vin ENABLE ROW LEVEL SECURITY;

-- Événements publiquement lisibles
CREATE POLICY "Événements publiquement lisibles" 
ON public.event 
FOR SELECT 
USING (true);

-- Organisateurs gèrent leurs événements
CREATE POLICY "Organisateurs gèrent leurs événements" 
ON public.event 
FOR ALL 
USING (auth.uid() = organizer_id)
WITH CHECK (auth.uid() = organizer_id);

-- Relations événements-domaines publiquement lisibles
CREATE POLICY "Relations événements-domaines lisibles" 
ON public.event_domaine 
FOR SELECT 
USING (true);

-- Relations événements-domaines-vins publiquement lisibles
CREATE POLICY "Relations événements-vins lisibles" 
ON public.event_domaine_vin 
FOR SELECT 
USING (true);

-- =====================================================
-- ÉTAPE 13 : CRÉATION BUCKET STORAGE POUR AVATARS
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Politiques storage pour avatars
CREATE POLICY "Avatars publiquement visibles" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Utilisateurs uploadent leur avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Utilisateurs mettent à jour leur avatar" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Utilisateurs suppriment leur avatar" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);