-- Supprimer le trigger et la fonction de création automatique de bucket
DROP TRIGGER IF EXISTS trigger_create_domain_bucket ON domain;
DROP FUNCTION IF EXISTS create_domain_bucket_trigger();