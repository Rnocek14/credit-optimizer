-- Phase 1A: Alternative Courses Critical Foundation
-- 1. Create provider enum and enhance alternative_courses table
CREATE TYPE IF NOT EXISTS alt_course_provider AS ENUM (
  'youtube', 'udemy', 'coursera', 'edx', 'masterclass', 'other'
);

-- Add missing columns to alternative_courses (if they don't exist)
DO $$
BEGIN
  -- Add provider column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alternative_courses' AND column_name='provider') THEN
    ALTER TABLE alternative_courses ADD COLUMN provider alt_course_provider DEFAULT 'other';
    UPDATE alternative_courses SET provider = 'other' WHERE provider IS NULL;
    ALTER TABLE alternative_courses ALTER COLUMN provider SET NOT NULL;
  END IF;

  -- Add external_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alternative_courses' AND column_name='external_id') THEN
    ALTER TABLE alternative_courses ADD COLUMN external_id text;
    UPDATE alternative_courses SET external_id = id::text WHERE external_id IS NULL;
    ALTER TABLE alternative_courses ALTER COLUMN external_id SET NOT NULL;
  END IF;

  -- Add creator_name column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alternative_courses' AND column_name='creator_name') THEN
    ALTER TABLE alternative_courses ADD COLUMN creator_name text;
  END IF;

  -- Add published_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alternative_courses' AND column_name='published_at') THEN
    ALTER TABLE alternative_courses ADD COLUMN published_at timestamptz;
  END IF;

  -- Add skills column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alternative_courses' AND column_name='skills') THEN
    ALTER TABLE alternative_courses ADD COLUMN skills jsonb DEFAULT '[]'::jsonb;
  END IF;

  -- Add topics column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='alternative_courses' AND column_name='topics') THEN
    ALTER TABLE alternative_courses ADD COLUMN topics tsvector;
  END IF;
END $$;

-- 2. Create unique constraints and indexes
DO $$
BEGIN
  -- Unique constraint on provider + external_id
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'alt_courses_provider_external_id_unique') THEN
    ALTER TABLE alternative_courses ADD CONSTRAINT alt_courses_provider_external_id_unique 
    UNIQUE (provider, external_id);
  END IF;

  -- GIN index on skills
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_alt_courses_skills_gin') THEN
    CREATE INDEX idx_alt_courses_skills_gin ON alternative_courses USING GIN (skills);
  END IF;

  -- GIN index on topics
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_alt_courses_topics_gin') THEN
    CREATE INDEX idx_alt_courses_topics_gin ON alternative_courses USING GIN (topics);
  END IF;
END $$;

-- 3. Create user_alt_course_usage table
CREATE TABLE IF NOT EXISTS user_alt_course_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  track_id uuid NOT NULL,
  alt_course_id uuid NOT NULL REFERENCES alternative_courses(id) ON DELETE CASCADE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_alt_usage_unique UNIQUE (user_id, track_id, alt_course_id)
);

-- 4. Enable RLS on both tables
ALTER TABLE alternative_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_alt_course_usage ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for alternative_courses (public read)
DROP POLICY IF EXISTS "alt_courses_public_read" ON alternative_courses;
CREATE POLICY "alt_courses_public_read" ON alternative_courses
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "alt_courses_service_manage" ON alternative_courses;
CREATE POLICY "alt_courses_service_manage" ON alternative_courses
  FOR ALL USING (true) WITH CHECK (true);

-- 6. RLS Policies for user_alt_course_usage (owner-only)
DROP POLICY IF EXISTS "alt_usage_owner_read" ON user_alt_course_usage;
CREATE POLICY "alt_usage_owner_read" ON user_alt_course_usage
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "alt_usage_owner_insert" ON user_alt_course_usage;
CREATE POLICY "alt_usage_owner_insert" ON user_alt_course_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "alt_usage_owner_update" ON user_alt_course_usage;
CREATE POLICY "alt_usage_owner_update" ON user_alt_course_usage
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "alt_usage_owner_delete" ON user_alt_course_usage;
CREATE POLICY "alt_usage_owner_delete" ON user_alt_course_usage
  FOR DELETE USING (auth.uid() = user_id);

-- 7. Create trigger functions for maintaining topics and updated_at
CREATE OR REPLACE FUNCTION update_alt_courses_topics() 
RETURNS TRIGGER AS $$
BEGIN
  NEW.topics := 
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.creator_name, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create triggers
DROP TRIGGER IF EXISTS trg_alt_courses_topics ON alternative_courses;
CREATE TRIGGER trg_alt_courses_topics
  BEFORE INSERT OR UPDATE ON alternative_courses
  FOR EACH ROW EXECUTE FUNCTION update_alt_courses_topics();

DROP TRIGGER IF EXISTS trg_alt_courses_updated ON alternative_courses;
CREATE TRIGGER trg_alt_courses_updated
  BEFORE UPDATE ON alternative_courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Update existing records to populate topics
UPDATE alternative_courses SET updated_at = now() WHERE topics IS NULL;