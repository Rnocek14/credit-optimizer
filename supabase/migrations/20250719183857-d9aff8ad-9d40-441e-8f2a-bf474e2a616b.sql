-- Fix the public resume display for demo users

-- 1. Ensure profile.user_id is set correctly
UPDATE public.profiles
SET user_id = '2b458624-d498-4cca-a63d-9341cc20e363'::uuid
WHERE name = 'Aisha Khan' AND user_id IS NULL;

-- 2. Ensure gallery_enabled is true for public viewing
UPDATE public.profiles
SET gallery_enabled = true
WHERE user_id = '2b458624-d498-4cca-a63d-9341cc20e363'::uuid;

-- 3. Confirm published_to_profile is true for the demo resume
UPDATE public.ai_resume_drafts
SET published_to_profile = true
WHERE user_id = '2b458624-d498-4cca-a63d-9341cc20e363'::uuid;