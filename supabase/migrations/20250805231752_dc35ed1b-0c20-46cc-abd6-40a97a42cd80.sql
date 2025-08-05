-- Populate user_roles table for dev users
INSERT INTO public.user_roles (user_id, role) VALUES
  ('2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'mentor'),  -- Aisha Khan
  ('3c459625-e499-5ddb-b64d-a442dd21f474'::uuid, 'user'),    -- Mateo Silva  
  ('4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid, 'admin')    -- Jade Chen
ON CONFLICT (user_id, role) DO NOTHING;