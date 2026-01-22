-- Table pour stocker les messages du formulaire de contact
CREATE TABLE public.contact_message (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'read', 'replied', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now(),
  replied_at TIMESTAMPTZ,
  admin_notes TEXT
);

-- Activer RLS
ALTER TABLE public.contact_message ENABLE ROW LEVEL SECURITY;

-- Politique : tout le monde peut insérer un message (même anonyme)
CREATE POLICY "Anyone can insert contact messages" 
  ON public.contact_message 
  FOR INSERT 
  WITH CHECK (true);

-- Politique : seuls les super_admins peuvent lire les messages
CREATE POLICY "Super admins can read contact messages" 
  ON public.contact_message 
  FOR SELECT 
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Politique : seuls les super_admins peuvent modifier les messages
CREATE POLICY "Super admins can update contact messages" 
  ON public.contact_message 
  FOR UPDATE 
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Politique : seuls les super_admins peuvent supprimer les messages
CREATE POLICY "Super admins can delete contact messages" 
  ON public.contact_message 
  FOR DELETE 
  USING (has_role(auth.uid(), 'super_admin'::app_role));