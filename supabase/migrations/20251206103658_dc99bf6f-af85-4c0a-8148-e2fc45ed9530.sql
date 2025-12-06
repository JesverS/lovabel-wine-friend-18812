-- Étape 1: Ajouter les nouvelles colonnes à user_event
ALTER TABLE public.user_event 
ADD COLUMN IF NOT EXISTS access_origin VARCHAR(20) DEFAULT 'created',
ADD COLUMN IF NOT EXISTS granted_by UUID REFERENCES auth.users(id);

-- Commentaire sur les colonnes
COMMENT ON COLUMN public.user_event.access_origin IS 'Origin of access: created, invited, paid, approved, public';
COMMENT ON COLUMN public.user_event.granted_by IS 'User ID who granted the access (for approved requests)';

-- Étape 2: Migrer les données de event_member vers user_event
INSERT INTO public.user_event (user_id, event_id, role, access_origin, granted_by, created_at)
SELECT 
  em.user_id,
  em.event_id,
  'participant'::event_role,
  CASE 
    WHEN em.access_type = 'paid' THEN 'paid'
    WHEN em.access_type = 'request_based' THEN 'approved'
    WHEN em.access_type = 'public' THEN 'public'
    ELSE 'invited'
  END,
  em.granted_by,
  em.created_at
FROM public.event_member em
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_event ue 
  WHERE ue.user_id = em.user_id AND ue.event_id = em.event_id
);

-- Étape 3: Mettre à jour les RLS policies pour user_event
-- D'abord supprimer les anciennes politiques liées à event_member

-- Politique pour voir ses propres participations
DROP POLICY IF EXISTS "Users can see their own participations" ON public.user_event;
CREATE POLICY "Users can see their own participations" 
ON public.user_event 
FOR SELECT 
USING (auth.uid() = user_id);

-- Ajouter la nouvelle valeur 'participant' si pas déjà présente dans l'enum event_role
-- Note: 'participant' devrait déjà exister dans l'enum d'après les memories