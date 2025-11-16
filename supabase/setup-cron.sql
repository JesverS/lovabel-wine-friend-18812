-- ⚠️ Ce fichier doit être exécuté MANUELLEMENT dans le SQL Editor de Supabase
-- 📍 https://supabase.com/dashboard/project/amzutunyjouejovlrlah/sql/new

-- Activer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Créer le cron job pour le reset hebdomadaire
-- Exécution tous les dimanches à 2h00 du matin
SELECT cron.schedule(
  'weekly-lesson-reset',
  '0 2 * * 0',  -- Cron: minute heure jour mois jour-semaine (0 = dimanche)
  $$
  SELECT net.http_post(
    url := 'https://amzutunyjouejovlrlah.supabase.co/functions/v1/weekly-lesson-reset',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtenV0dW55am91ZWpvdmxybGFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MjAwMzYsImV4cCI6MjA3NjM5NjAzNn0.s_qoH0jB08XXjSLthlbumY0Tj9jBxV5zm24tPU34Q6M"}'::jsonb,
    body := '{"trigger": "cron"}'::jsonb
  ) as request_id;
  $$
);

-- Vérifier que le cron job a bien été créé
SELECT * FROM cron.job WHERE jobname = 'weekly-lesson-reset';

-- Pour tester manuellement le cron job (optionnel):
-- SELECT cron.schedule('test-weekly-lesson-reset', '* * * * *', $$ SELECT net.http_post(...) $$);
-- SELECT cron.unschedule('test-weekly-lesson-reset');

-- Pour supprimer le cron job (si nécessaire):
-- SELECT cron.unschedule('weekly-lesson-reset');
