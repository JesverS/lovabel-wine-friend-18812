

# Fix: Restore `is_public` column in `user_profiles_public` view

## Root cause

The migration `20260308115822` that changed `phone_number` to `text` recreated the `user_profiles_public` view but **omitted the `is_public` column**. This column is queried by `UserProfile.tsx`, `useSocialFeed.ts`, `PostDetails.tsx`, and others, causing 400 errors across the site.

## Fix

One SQL migration to recreate the view with the missing `is_public` column:

```sql
DROP VIEW IF EXISTS public.user_profiles_public;

CREATE VIEW public.user_profiles_public
WITH (security_invoker=on) AS
SELECT 
  id,
  full_name,
  last_name,
  logo_adress,
  city,
  description,
  level,
  slug,
  is_public,
  CASE WHEN allow_email THEN email ELSE NULL::text END AS email,
  CASE WHEN allow_phone THEN phone_number ELSE NULL::text END AS phone_number,
  CASE WHEN allow_adress THEN address ELSE NULL::text END AS address,
  CASE WHEN allow_xp THEN xp ELSE NULL::bigint END AS experience
FROM user_profiles;
```

No frontend changes needed. Single migration file.

