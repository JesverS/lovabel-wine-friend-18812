
-- Ajout du rôle 'premium' à l'enum existant
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'premium';
