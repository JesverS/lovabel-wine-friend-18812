-- Performance indexes for high-traffic tables
-- Based on Supabase performance diagnostics showing sequential scans

-- Index for event table (filtering by date and public status)
CREATE INDEX IF NOT EXISTS idx_event_start_date ON public.event(start_date);
CREATE INDEX IF NOT EXISTS idx_event_is_public ON public.event(is_public);
CREATE INDEX IF NOT EXISTS idx_event_city ON public.event(city);

-- Index for cellar table (filtering by public status)
CREATE INDEX IF NOT EXISTS idx_cellar_is_public ON public.cellar(is_public);