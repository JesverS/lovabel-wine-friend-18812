-- ⚠️ Ce fichier doit être exécuté MANUELLEMENT dans le SQL Editor de Supabase
-- 📍 https://supabase.com/dashboard/project/amzutunyjouejovlrlah/sql/new

-- Activer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================
-- CRON JOB 1: Reset hebdomadaire des leçons
-- Exécution tous les dimanches à 2h00 du matin
-- ============================================
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

-- ============================================
-- CRON JOB 2: Nettoyage des paiements expirés
-- Exécution toutes les 5 minutes
-- Libère les places réservées par des paiements abandonnés (30 min timeout)
-- ============================================
SELECT cron.schedule(
  'cleanup-expired-payments',
  '*/5 * * * *',  -- Toutes les 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://amzutunyjouejovlrlah.supabase.co/functions/v1/cleanup-expired-payments',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtenV0dW55am91ZWpvdmxybGFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MjAwMzYsImV4cCI6MjA3NjM5NjAzNn0.s_qoH0jB08XXjSLthlbumY0Tj9jBxV5zm24tPU34Q6M"}'::jsonb,
    body := '{"trigger": "cron"}'::jsonb
  ) as request_id;
  $$
);

-- Vérifier que les cron jobs ont bien été créés
SELECT * FROM cron.job WHERE jobname IN ('weekly-lesson-reset', 'cleanup-expired-payments');

-- Pour supprimer les cron jobs (si nécessaire):
-- SELECT cron.unschedule('weekly-lesson-reset');
-- SELECT cron.unschedule('cleanup-expired-payments');
