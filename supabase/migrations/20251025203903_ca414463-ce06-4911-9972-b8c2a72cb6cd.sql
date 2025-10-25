-- Drop existing policies that depend on role column
DROP POLICY IF EXISTS "super_admin_manage_roles" ON public.user_profiles;
DROP POLICY IF EXISTS "update_own_profile" ON public.user_profiles;

-- Create role enum (keeping 'user' for consistency but won't store it)
CREATE TYPE public.app_role AS ENUM ('user', 'admin', 'super_admin');

-- Create user_roles table (only stores admin and super_admin)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Migrate only admin and super_admin roles from user_profiles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::app_role
FROM public.user_profiles
WHERE role IN ('admin', 'super_admin');

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
  )
$$;

-- Update is_super_admin function
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'super_admin');
$$;

-- Update get_user_role function (returns 'user' if no entry found)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid()),
    'user'
  );
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Super admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Remove role column from user_profiles
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS role;

-- Create new RLS policies for user_profiles
CREATE POLICY "Users can update own profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Update trigger to not create user_roles entry for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id)
  VALUES (new.id);
  -- No user_roles entry = default 'user' role
  RETURN new;
END;
$$;