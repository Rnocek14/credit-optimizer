-- First, let's normalize all provider values to lowercase to match our code expectations
UPDATE public.alternative_courses 
SET provider = CASE 
  WHEN lower(provider) = 'youtube' THEN 'youtube'
  WHEN lower(provider) = 'udemy' THEN 'udemy' 
  WHEN lower(provider) = 'coursera' THEN 'coursera'
  WHEN lower(provider) = 'edx' THEN 'edx'
  WHEN lower(provider) = 'masterclass' THEN 'masterclass'
  WHEN lower(provider) = 'hustlersu' THEN 'other'
  ELSE 'other'
END;

-- Now add the constraint that matches our TypeScript type
ALTER TABLE public.alternative_courses 
DROP CONSTRAINT IF EXISTS alternative_courses_provider_check;

ALTER TABLE public.alternative_courses 
ADD CONSTRAINT alternative_courses_provider_check 
CHECK (provider IN ('youtube', 'udemy', 'coursera', 'edx', 'masterclass', 'other'));

-- Add the description column
ALTER TABLE public.alternative_courses 
ADD COLUMN IF NOT EXISTS description text;