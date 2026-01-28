-- Phase 1a : Ajouter la valeur "effervescent" à l'enum
ALTER TYPE wine_type_enum ADD VALUE IF NOT EXISTS 'effervescent';