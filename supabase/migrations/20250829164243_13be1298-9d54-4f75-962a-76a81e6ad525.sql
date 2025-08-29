-- Add missing description column to alternative_courses table
ALTER TABLE public.alternative_courses 
ADD COLUMN IF NOT EXISTS description text;

-- Update the provider constraint to match the code expectations
ALTER TABLE public.alternative_courses 
DROP CONSTRAINT IF EXISTS alternative_courses_provider_check;

ALTER TABLE public.alternative_courses 
ADD CONSTRAINT alternative_courses_provider_check 
CHECK (provider IN ('youtube', 'udemy', 'coursera', 'edx', 'masterclass', 'other'));

-- Ensure we have a unique constraint on (provider, external_id) for deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_alternative_courses_provider_external_id 
ON public.alternative_courses (provider, external_id);