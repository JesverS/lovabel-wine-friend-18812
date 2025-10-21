-- Supprimer les policies problématiques
DROP POLICY IF EXISTS "Utilisateurs peuvent voir événements accessibles" ON public.event;
DROP POLICY IF EXISTS "Organisateurs et participants peuvent modifier événements" ON public.event;
DROP POLICY IF EXISTS "Utilisateurs peuvent voir participations événements" ON public.user_event;
DROP POLICY IF EXISTS "Organisateurs et utilisateurs peuvent créer participations" ON public.user_event;
DROP POLICY IF EXISTS "Organisateurs peuvent modifier participations" ON public.user_event;
DROP POLICY IF EXISTS "Organisateurs et utilisateurs peuvent supprimer participations" ON public.user_event;

-- Créer des fonctions security definer pour éviter la récursion

-- Fonction pour vérifier si un utilisateur participe à un événement
CREATE OR REPLACE FUNCTION public.user_participates_in_event(_user_id uuid, _event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_event
    WHERE user_id = _user_id
    AND event_id = _event_id
  )
$$;

-- Fonction pour vérifier si un événement est public
CREATE OR REPLACE FUNCTION public.event_is_public(_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_public
  FROM public.event
  WHERE id = _event_id
$$;

-- Fonction pour vérifier si un utilisateur est l'organisateur d'un événement
CREATE OR REPLACE FUNCTION public.user_is_event_organizer(_user_id uuid, _event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.event
    WHERE id = _event_id
    AND organizer_id = _user_id
  )
$$;

-- Nouvelles policies pour event utilisant les fonctions
CREATE POLICY "Utilisateurs peuvent voir événements accessibles"
ON public.event
FOR SELECT
TO authenticated
USING (
  is_public = true 
  OR auth.uid() = organizer_id
  OR public.user_participates_in_event(auth.uid(), id)
);

CREATE POLICY "Organisateurs et participants peuvent modifier événements"
ON public.event
FOR UPDATE
TO authenticated
USING (
  auth.uid() = organizer_id
  OR public.user_participates_in_event(auth.uid(), id)
)
WITH CHECK (
  auth.uid() = organizer_id
  OR public.user_participates_in_event(auth.uid(), id)
);

-- Nouvelles policies pour user_event utilisant les fonctions
CREATE POLICY "Utilisateurs peuvent voir participations événements"
ON public.user_event
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.event_is_public(event_id)
  OR public.user_is_event_organizer(auth.uid(), event_id)
);

CREATE POLICY "Organisateurs et utilisateurs peuvent créer participations"
ON public.user_event
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR public.user_is_event_organizer(auth.uid(), event_id)
);

CREATE POLICY "Organisateurs peuvent modifier participations"
ON public.user_event
FOR UPDATE
TO authenticated
USING (public.user_is_event_organizer(auth.uid(), event_id))
WITH CHECK (public.user_is_event_organizer(auth.uid(), event_id));

CREATE POLICY "Organisateurs et utilisateurs peuvent supprimer participations"
ON public.user_event
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  OR public.user_is_event_organizer(auth.uid(), event_id)
);