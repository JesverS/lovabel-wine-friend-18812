-- Restore SECURITY DEFINER for user_profiles_public view
-- This view has its own security logic via CASE WHEN based on allow_* flags
-- SECURITY DEFINER is appropriate here as the view controls data visibility internally

-- Drop the existing view
DROP VIEW IF EXISTS public.user_profiles_public;

-- Recreate the view with SECURITY DEFINER (default behavior)
CREATE VIEW public.user_profiles_public AS
SELECT 
  id,
  full_name,
  logo_adress,
  city,
  description,
  level,
  CASE
    WHEN allow_email THEN email
    ELSE NULL::text
  END AS email,
  CASE
    WHEN allow_phone THEN phone_number
    ELSE NULL::bigint
  END AS phone_number,
  CASE
    WHEN allow_adress THEN address
    ELSE NULL::text
  END AS address,
  CASE
    WHEN allow_xp THEN xp
    ELSE NULL::bigint
  END AS experience
FROM user_profiles;