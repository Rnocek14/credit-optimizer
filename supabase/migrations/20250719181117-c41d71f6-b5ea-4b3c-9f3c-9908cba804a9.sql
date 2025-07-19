-- Add unique constraint to profiles table and insert demo data
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

-- Now insert profiles for demo users 
INSERT INTO public.profiles (user_id, name, role_title, experience_level, industry, skills, location, gallery_enabled) VALUES
  ('3c459625-e499-5ddb-b64d-a442dd21f474'::uuid, 'Mateo Silva', 'Product Manager', 'Mid-level', 'Technology', ARRAY['Product Strategy', 'Agile', 'Data Analysis', 'User Research', 'Roadmapping'], 'Austin, TX', true),
  ('4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid, 'Jade Chen', 'UX Designer', 'Mid-level', 'Design', ARRAY['Figma', 'User Research', 'Prototyping', 'Design Systems', 'Usability Testing'], 'Seattle, WA', true)
ON CONFLICT (user_id) DO NOTHING;

-- Create XP records for users
INSERT INTO public.user_xp (user_id, total_xp) VALUES
  ('3c459625-e499-5ddb-b64d-a442dd21f474'::uuid, 1200), -- Level 4
  ('4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid, 180)   -- Level 2
ON CONFLICT (user_id) DO NOTHING;