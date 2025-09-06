-- Create profile for Mateo (demo user) if it doesn't exist
INSERT INTO profiles (user_id, name, role) 
VALUES ('3c459625-e499-5ddb-b64d-a442dd21f474', 'Mateo Silva', 'user')
ON CONFLICT (user_id) DO NOTHING;