-- Fix the PublicResume display for demo users by updating user_id in profiles table
-- The profile.id already has the correct UUID, we just need to copy it to user_id

UPDATE public.profiles
SET user_id = id
WHERE name = 'Aisha Khan' AND user_id IS NULL;

-- Also ensure gallery_enabled is true so it shows up publicly
UPDATE public.profiles
SET gallery_enabled = true
WHERE name = 'Aisha Khan';