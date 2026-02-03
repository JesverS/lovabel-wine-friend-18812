-- Table de tracking des scans IA
CREATE TABLE public.ai_scan_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_type text NOT NULL DEFAULT 'wine_label',
  scanned_at timestamptz NOT NULL DEFAULT now(),
  tokens_used integer,
  success boolean DEFAULT true,
  error_code text
);

-- Index simple pour requêtes par utilisateur (la fonction filtre par date)
CREATE INDEX idx_ai_scan_usage_user_scanned ON ai_scan_usage (user_id, scanned_at);

-- RLS : utilisateur peut voir ses propres scans
ALTER TABLE ai_scan_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scans" ON ai_scan_usage
  FOR SELECT USING (auth.uid() = user_id);

-- Fonction SECURITY DEFINER pour compter les scans du mois (évite récursion RLS)
CREATE OR REPLACE FUNCTION public.get_monthly_scan_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COUNT(*)::integer
  FROM ai_scan_usage
  WHERE user_id = p_user_id
  AND scanned_at >= date_trunc('month', now())
  AND success = true;
$$;