-- ============================================
-- MIGRATION : timestamp -> timestamptz
-- Conversion de toutes les colonnes timestamp sans timezone
-- vers timestamp with time zone (timestamptz)
-- ============================================

-- 1. Table: cellar
ALTER TABLE cellar 
  ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamp with time zone USING updated_at AT TIME ZONE 'UTC';

-- 2. Table: cellar_wine
ALTER TABLE cellar_wine 
  ALTER COLUMN added_at TYPE timestamp with time zone USING added_at AT TIME ZONE 'UTC';

-- 3. Table: domain
ALTER TABLE domain 
  ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamp with time zone USING updated_at AT TIME ZONE 'UTC';

-- 4. Table: event
ALTER TABLE event 
  ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamp with time zone USING updated_at AT TIME ZONE 'UTC';

-- 5. Table: post
ALTER TABLE post 
  ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamp with time zone USING updated_at AT TIME ZONE 'UTC';

-- 6. Table: post_comment
ALTER TABLE post_comment 
  ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamp with time zone USING updated_at AT TIME ZONE 'UTC';

-- 7. Table: post_comment_like
ALTER TABLE post_comment_like 
  ALTER COLUMN liked_at TYPE timestamp with time zone USING liked_at AT TIME ZONE 'UTC';

-- 8. Table: post_like
ALTER TABLE post_like 
  ALTER COLUMN liked_at TYPE timestamp with time zone USING liked_at AT TIME ZONE 'UTC';

-- 9. Table: user_cellar
ALTER TABLE user_cellar 
  ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC';

-- 10. Table: user_follow
ALTER TABLE user_follow 
  ALTER COLUMN followed_at TYPE timestamp with time zone USING followed_at AT TIME ZONE 'UTC';

-- 11. Table: user_profiles
ALTER TABLE user_profiles 
  ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamp with time zone USING updated_at AT TIME ZONE 'UTC';

-- 12. Table: user_wine_notice
ALTER TABLE user_wine_notice 
  ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamp with time zone USING updated_at AT TIME ZONE 'UTC';

-- 13. Table: wine
ALTER TABLE wine 
  ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamp with time zone USING updated_at AT TIME ZONE 'UTC';