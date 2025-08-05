-- Add sample role data for teaching system navigation
-- Update profiles table with correct roles
UPDATE public.profiles 
SET role = 'mentor' 
WHERE user_id = '2b458624-d498-4cca-a63d-9341cc20e363';

UPDATE public.profiles 
SET role = 'mentor' 
WHERE user_id = '3c459625-e499-5ddb-b64d-a442dd21f474';

UPDATE public.profiles 
SET role = 'admin' 
WHERE user_id = '4d56a736-f5aa-6eec-c75e-b553ee32e585';

-- Insert into user_roles table (this will work with dev users)
-- Note: This requires the users to exist in auth.users first (via dev login)
-- For now we'll create a conditional insert

DO $$
BEGIN
  -- Only insert if the user exists (for safety)
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = '2b458624-d498-4cca-a63d-9341cc20e363') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES 
    ('2b458624-d498-4cca-a63d-9341cc20e363', 'mentor')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE id = '3c459625-e499-5ddb-b64d-a442dd21f474') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES 
    ('3c459625-e499-5ddb-b64d-a442dd21f474', 'mentor')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE id = '4d56a736-f5aa-6eec-c75e-b553ee32e585') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES 
    ('4d56a736-f5aa-6eec-c75e-b553ee32e585', 'admin'),
    ('4d56a736-f5aa-6eec-c75e-b553ee32e585', 'mentor')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;