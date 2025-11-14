-- ====================================================================
-- Migration : Recréer user_profiles_public avec SECURITY DEFINER
-- ====================================================================

-- 1. Drop la vue existante si elle existe
DROP VIEW IF EXISTS public.user_profiles_public CASCADE;

-- 2. Recréer la vue avec SECURITY DEFINER (security_invoker=false)
CREATE VIEW public.user_profiles_public 
WITH (security_invoker=false)
AS
SELECT 
  id,
  full_name,
  logo_adress,
  city,
  description,
  level,
  -- Champs conditionnels selon les préférences de confidentialité
  CASE WHEN allow_email THEN email ELSE NULL END AS email,
  CASE WHEN allow_phone THEN phone_number ELSE NULL END AS phone_number,
  CASE WHEN allow_adress THEN address ELSE NULL END AS address,
  CASE WHEN allow_xp THEN xp ELSE NULL END AS experience
FROM public.user_profiles;

-- 3. Grant SELECT à authenticated et anon
GRANT SELECT ON public.user_profiles_public TO authenticated;
GRANT SELECT ON public.user_profiles_public TO anon;

-- 4. Commentaire explicatif
COMMENT ON VIEW public.user_profiles_public IS 
'Vue publique des profils utilisateurs. Utilise SECURITY DEFINER pour bypasser RLS. Les champs sensibles (email, phone, address, xp) sont filtrés selon les préférences de confidentialité (allow_*).';