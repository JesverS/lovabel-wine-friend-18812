-- Ajouter les colonnes manquantes à la table event
ALTER TABLE public.event 
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS registration_link TEXT;

-- Mettre à jour les données existantes si location contient ville+adresse
UPDATE public.event 
SET city = location 
WHERE city IS NULL AND location IS NOT NULL;

-- Créer un index sur city pour améliorer les performances des filtres
CREATE INDEX IF NOT EXISTS idx_event_city ON public.event(city);
CREATE INDEX IF NOT EXISTS idx_event_start_date ON public.event(start_date);
CREATE INDEX IF NOT EXISTS idx_event_is_public ON public.event(is_public);

-- Mettre à jour les politiques RLS pour event_domain
DROP POLICY IF EXISTS "Relations événements-domaines lisibles" ON public.event_domain;
CREATE POLICY "Relations événements-domaines lisibles" 
ON public.event_domain 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.event 
    WHERE event.id = event_domain.event_id 
    AND event.is_public = true
  )
);

-- Ajouter politique pour les organisateurs
CREATE POLICY "Organisateurs gèrent event_domain" 
ON public.event_domain 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.event 
    WHERE event.id = event_domain.event_id 
    AND event.organizer_id = auth.uid()
  )
);

-- Mettre à jour les politiques RLS pour event_domain_wine
DROP POLICY IF EXISTS "Relations événements-vins lisibles" ON public.event_domain_wine;
CREATE POLICY "Relations événements-vins lisibles" 
ON public.event_domain_wine 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.event 
    WHERE event.id = event_domain_wine.event_id 
    AND event.is_public = true
  )
);

-- Ajouter politique pour les organisateurs
CREATE POLICY "Organisateurs gèrent event_domain_wine" 
ON public.event_domain_wine 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.event 
    WHERE event.id = event_domain_wine.event_id 
    AND event.organizer_id = auth.uid()
  )
);

-- Mettre à jour les politiques pour user_favorite
ALTER TABLE public.user_favorite ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateurs gèrent leurs favoris" 
ON public.user_favorite 
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Favoris publiquement lisibles" 
ON public.user_favorite 
FOR SELECT 
USING (true);