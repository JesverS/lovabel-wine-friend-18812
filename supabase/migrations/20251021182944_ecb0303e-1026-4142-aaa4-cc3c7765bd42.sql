-- Ajouter une colonne category à la table event si elle n'existe pas
ALTER TABLE public.event 
ADD COLUMN IF NOT EXISTS category text;

-- Mettre à jour les policies pour la table event
-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Organisateurs gèrent leurs événements" ON public.event;
DROP POLICY IF EXISTS "Événements publiquement lisibles" ON public.event;

-- Nouvelle policy : création autorisée pour tous les utilisateurs authentifiés
CREATE POLICY "Utilisateurs authentifiés peuvent créer des événements"
ON public.event
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = organizer_id);

-- Nouvelle policy : lecture autorisée si public OU si organisateur OU si participant
CREATE POLICY "Utilisateurs peuvent voir événements accessibles"
ON public.event
FOR SELECT
TO authenticated
USING (
  is_public = true 
  OR auth.uid() = organizer_id
  OR EXISTS (
    SELECT 1 FROM public.user_event
    WHERE user_event.event_id = event.id
    AND user_event.user_id = auth.uid()
  )
);

-- Nouvelle policy : modification autorisée si organisateur OU si participant dans user_event
CREATE POLICY "Organisateurs et participants peuvent modifier événements"
ON public.event
FOR UPDATE
TO authenticated
USING (
  auth.uid() = organizer_id
  OR EXISTS (
    SELECT 1 FROM public.user_event
    WHERE user_event.event_id = event.id
    AND user_event.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = organizer_id
  OR EXISTS (
    SELECT 1 FROM public.user_event
    WHERE user_event.event_id = event.id
    AND user_event.user_id = auth.uid()
  )
);

-- Nouvelle policy : suppression uniquement pour l'organisateur
CREATE POLICY "Organisateurs peuvent supprimer leurs événements"
ON public.event
FOR DELETE
TO authenticated
USING (auth.uid() = organizer_id);

-- Activer RLS sur user_event si ce n'est pas déjà fait
ALTER TABLE public.user_event ENABLE ROW LEVEL SECURITY;

-- Policies pour user_event
-- Lecture : utilisateurs peuvent voir les participations aux événements publics ou aux leurs
CREATE POLICY "Utilisateurs peuvent voir participations événements"
ON public.user_event
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.event
    WHERE event.id = user_event.event_id
    AND (event.is_public = true OR event.organizer_id = auth.uid())
  )
);

-- Insertion : organisateur peut ajouter des participants, ou utilisateur peut s'ajouter lui-même
CREATE POLICY "Organisateurs et utilisateurs peuvent créer participations"
ON public.user_event
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.event
    WHERE event.id = user_event.event_id
    AND event.organizer_id = auth.uid()
  )
);

-- Modification : organisateur de l'événement peut modifier les rôles
CREATE POLICY "Organisateurs peuvent modifier participations"
ON public.user_event
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.event
    WHERE event.id = user_event.event_id
    AND event.organizer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.event
    WHERE event.id = user_event.event_id
    AND event.organizer_id = auth.uid()
  )
);

-- Suppression : organisateur peut supprimer, ou utilisateur peut se retirer
CREATE POLICY "Organisateurs et utilisateurs peuvent supprimer participations"
ON public.user_event
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.event
    WHERE event.id = user_event.event_id
    AND event.organizer_id = auth.uid()
  )
);

-- Policies pour le bucket event
-- Upload : organisateur ou participant
CREATE POLICY "Organisateurs et participants peuvent uploader images événements"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event'
  AND (
    EXISTS (
      SELECT 1 FROM public.event
      WHERE event.id::text = (storage.foldername(name))[1]
      AND event.organizer_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_event
      WHERE user_event.event_id::text = (storage.foldername(name))[1]
      AND user_event.user_id = auth.uid()
    )
  )
);

-- Lecture : public pour événements publics, sinon restreint
CREATE POLICY "Images événements publics sont lisibles"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'event'
  AND (
    EXISTS (
      SELECT 1 FROM public.event
      WHERE event.id::text = (storage.foldername(name))[1]
      AND event.is_public = true
    )
    OR EXISTS (
      SELECT 1 FROM public.event
      WHERE event.id::text = (storage.foldername(name))[1]
      AND event.organizer_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_event
      WHERE user_event.event_id::text = (storage.foldername(name))[1]
      AND user_event.user_id = auth.uid()
    )
  )
);

-- Modification : organisateur ou participant
CREATE POLICY "Organisateurs et participants peuvent modifier images événements"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'event'
  AND (
    EXISTS (
      SELECT 1 FROM public.event
      WHERE event.id::text = (storage.foldername(name))[1]
      AND event.organizer_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_event
      WHERE user_event.event_id::text = (storage.foldername(name))[1]
      AND user_event.user_id = auth.uid()
    )
  )
)
WITH CHECK (
  bucket_id = 'event'
  AND (
    EXISTS (
      SELECT 1 FROM public.event
      WHERE event.id::text = (storage.foldername(name))[1]
      AND event.organizer_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_event
      WHERE user_event.event_id::text = (storage.foldername(name))[1]
      AND user_event.user_id = auth.uid()
    )
  )
);

-- Suppression : organisateur ou participant
CREATE POLICY "Organisateurs et participants peuvent supprimer images événements"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'event'
  AND (
    EXISTS (
      SELECT 1 FROM public.event
      WHERE event.id::text = (storage.foldername(name))[1]
      AND event.organizer_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_event
      WHERE user_event.event_id::text = (storage.foldername(name))[1]
      AND user_event.user_id = auth.uid()
    )
  )
);