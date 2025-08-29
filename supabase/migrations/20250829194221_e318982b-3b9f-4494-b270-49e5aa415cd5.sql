-- Fix provider data and constraint
-- 1) Map existing providers to lowercase valid values
UPDATE alternative_courses 
SET provider = CASE 
  WHEN lower(provider) = 'youtube' THEN 'youtube'
  WHEN lower(provider) = 'udemy' THEN 'udemy' 
  WHEN lower(provider) = 'coursera' THEN 'coursera'
  WHEN lower(provider) = 'edx' THEN 'edx'
  WHEN lower(provider) = 'masterclass' THEN 'masterclass'
  ELSE 'other'
END
WHERE provider IS NOT NULL;

-- 2) Now add the description column
ALTER TABLE alternative_courses 
ADD COLUMN IF NOT EXISTS description text;

-- 3) Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_alt_courses_provider_external 
  ON alternative_courses(provider, external_id);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_alt_courses_provider_external 
  ON alternative_courses(provider, external_id) 
  WHERE provider IS NOT NULL AND external_id IS NOT NULL;

-- 4) Add unique constraint on user alt course usage 
CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_alt_usage 
  ON user_alt_course_usage(user_id, track_id, alt_course_id);