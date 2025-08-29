-- Step 2: Now update provider data and add constraint
-- 1) Map existing providers to lowercase valid values
UPDATE alternative_courses 
SET provider = CASE 
  WHEN upper(provider) = 'YOUTUBE' THEN 'youtube'
  WHEN upper(provider) = 'UDEMY' THEN 'udemy' 
  WHEN upper(provider) = 'COURSERA' THEN 'coursera'
  WHEN upper(provider) = 'EDX' THEN 'edx'
  WHEN upper(provider) = 'MASTERCLASS' THEN 'masterclass'
  ELSE 'other'
END
WHERE provider IS NOT NULL;

-- 2) Add new constraint with lowercase providers
ALTER TABLE alternative_courses 
ADD CONSTRAINT alternative_courses_provider_check 
CHECK (provider IN ('youtube', 'udemy', 'coursera', 'edx', 'masterclass', 'other'));