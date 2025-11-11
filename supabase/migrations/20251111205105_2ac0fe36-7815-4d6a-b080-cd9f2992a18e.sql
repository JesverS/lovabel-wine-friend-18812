-- Ajouter co_owner à l'enum cellar_role
ALTER TYPE cellar_role ADD VALUE IF NOT EXISTS 'co_owner';