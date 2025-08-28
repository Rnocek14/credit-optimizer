-- Minimal demo user referral setup for Quick Start ShareModal
-- This ensures demo users have referral codes for sharing functionality

INSERT INTO public.referrals (user_id)
VALUES 
  ('2b458624-d498-4cca-a63d-9341cc20e363'),
  ('3c459625-e499-5ddb-b64d-a442dd21f474'),
  ('4d56a736-f5aa-6eec-c75e-b553ee32e585')
ON CONFLICT (user_id) DO NOTHING;