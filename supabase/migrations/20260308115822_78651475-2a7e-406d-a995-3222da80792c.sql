-- Recreate view with missing columns slug and last_name
DROP VIEW IF EXISTS public.user_profiles_public;

CREATE VIEW public.user_profiles_public AS
SELECT 
  id,
  full_name,
  last_name,
  logo_adress,
  city,
  description,
  level,
  slug,
  CASE
    WHEN allow_email THEN email
    ELSE NULL::text
  END AS email,
  CASE
    WHEN allow_phone THEN phone_number
    ELSE NULL::text
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