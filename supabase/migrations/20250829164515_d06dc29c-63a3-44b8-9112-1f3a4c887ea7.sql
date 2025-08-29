-- Ensure provider values are normalized and add missing description column
ALTER TABLE public.alternative_courses 
ADD COLUMN IF NOT EXISTS description text;

-- Normalize provider values to lowercase first
UPDATE public.alternative_courses
SET provider = lower(provider)
WHERE provider IS NOT NULL;

-- Set any unexpected provider values to 'other'
UPDATE public.alternative_courses
SET provider = 'other'
WHERE provider IS NULL OR provider NOT IN ('youtube','udemy','coursera','edx','masterclass','other');

-- Replace provider check constraint safely
ALTER TABLE public.alternative_courses 
DROP CONSTRAINT IF EXISTS alternative_courses_provider_check;

ALTER TABLE public.alternative_courses 
ADD CONSTRAINT alternative_courses_provider_check 
CHECK (provider IN ('youtube', 'udemy', 'coursera', 'edx', 'masterclass', 'other'));