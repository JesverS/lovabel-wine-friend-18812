-- Activer l'extension pg_net pour les requêtes HTTP
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Fonction pour créer automatiquement le bucket storage lors de la création d'un domaine
CREATE OR REPLACE FUNCTION create_domain_bucket_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_id bigint;
BEGIN
  -- Appeler l'edge function pour créer le bucket
  SELECT net.http_post(
    url := 'https://amzutunyjouejovlrlah.supabase.co/functions/v1/create-domain-bucket',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtenV0dW55am91ZWpvdmxybGFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MjAwMzYsImV4cCI6MjA3NjM5NjAzNn0.s_qoH0jB08XXjSLthlbumY0Tj9jBxV5zm24tPU34Q6M'
    ),
    body := jsonb_build_object('domain_id', NEW.id::text)
  ) INTO request_id;
  
  -- Le trigger retourne la nouvelle ligne
  RETURN NEW;
END;
$$;

-- Créer le trigger qui s'exécute après l'insertion d'un nouveau domaine
DROP TRIGGER IF EXISTS trigger_create_domain_bucket ON domain;
CREATE TRIGGER trigger_create_domain_bucket
  AFTER INSERT ON domain
  FOR EACH ROW
  EXECUTE FUNCTION create_domain_bucket_trigger();
