-- Remove foreign key constraint temporarily to allow dev user roles
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

-- Insert dev user roles without foreign key validation
INSERT INTO public.user_roles (user_id, role) VALUES
  ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'mentor'),  -- Aisha Khan
  ('3c459625-e499-5ddb-b64d-a442dd21f474'::uuid, 'user'),    -- Mateo Silva  
  ('4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid, 'admin')    -- Jade Chen
ON CONFLICT (user_id, role) DO NOTHING;

-- Re-add foreign key constraint for future real users (but allow existing dev users to remain)
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE 
NOT VALID;