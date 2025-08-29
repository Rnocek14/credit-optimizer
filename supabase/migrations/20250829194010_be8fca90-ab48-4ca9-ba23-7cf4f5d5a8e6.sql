-- Phase 1: Schema fixes for Alternative Courses
-- 1) Add missing description column and normalize provider values
ALTER TABLE IF EXISTS alternative_courses
  ADD COLUMN IF NOT EXISTS description text;

-- 2) Normalize provider casing to lowercase
UPDATE alternative_courses SET provider = lower(provider) WHERE provider IS NOT NULL;

-- 3) Add useful indexes for performance
CREATE INDEX IF NOT EXISTS idx_alt_courses_provider_external 
  ON alternative_courses(provider, external_id);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_alt_courses_provider_external 
  ON alternative_courses(provider, external_id) 
  WHERE provider IS NOT NULL AND external_id IS NOT NULL;

-- 4) Add unique constraint on user alt course usage
CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_alt_usage 
  ON user_alt_course_usage(user_id, track_id, alt_course_id);

-- 5) Ensure RLS policies are correct
ALTER TABLE alternative_courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS alt_courses_read_all ON alternative_courses;
CREATE POLICY alt_courses_read_all ON alternative_courses
  FOR SELECT USING (true);

ALTER TABLE user_alt_course_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS alt_usage_owner ON user_alt_course_usage;
CREATE POLICY alt_usage_owner ON user_alt_course_usage
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);