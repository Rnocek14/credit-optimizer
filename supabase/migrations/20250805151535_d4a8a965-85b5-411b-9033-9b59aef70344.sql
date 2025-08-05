-- Fix dev user role navigation - unconditional insert into user_roles
-- This solves the issue where get_user_role returns null for dev users

-- Insert dev user roles directly into user_roles table
-- These UUIDs correspond to the dev users in the system
INSERT INTO public.user_roles (user_id, role) VALUES 
('2b458624-d498-4cca-a63d-9341cc20e363', 'mentor'),  -- Aisha Khan
('3c459625-e499-5ddb-b64d-a442dd21f474', 'mentor'),  -- Mateo Silva  
('4d56a736-f5aa-6eec-c75e-b553ee32e585', 'admin'),   -- Jade Chen (admin)
('4d56a736-f5aa-6eec-c75e-b553ee32e585', 'mentor')   -- Jade Chen (mentor)
ON CONFLICT (user_id, role) DO NOTHING;