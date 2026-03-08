-- Drop dependent view first
DROP VIEW IF EXISTS public.user_profiles_public;

-- Alter column type
ALTER TABLE user_profiles ALTER COLUMN phone_number TYPE text USING phone_number::text;

-- Recreate view with text type
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