-- Create xp_history table to track XP gains
CREATE TABLE xp_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id bigint NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  xp_earned integer NOT NULL,
  reason text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Index for performance
CREATE INDEX idx_xp_history_user_id ON xp_history(user_id);
CREATE INDEX idx_xp_history_lesson_id ON xp_history(lesson_id);

-- RLS: Users can view their own XP history
ALTER TABLE xp_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own XP history"
  ON xp_history FOR SELECT
  USING (auth.uid() = user_id);