-- Fix Security Definer View issue
-- Change user_profiles_public view to use SECURITY INVOKER instead of SECURITY DEFINER
-- This makes the view enforce RLS policies of the querying user rather than the view creator

-- Drop the existing view
DROP VIEW IF EXISTS public.user_profiles_public;

-- Recreate the view with SECURITY INVOKER
CREATE VIEW public.user_profiles_public
WITH (security_invoker = true)
AS
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