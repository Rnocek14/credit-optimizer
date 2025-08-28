-- Simple demo user referral setup for Quick Start ShareModal
-- This ensures demo users have referral codes for sharing functionality

INSERT INTO public.referrals (user_id, clicks, signups, created_at, updated_at)
VALUES 
  ('2b458624-d498-4cca-a63d-9341cc20e363', 0, 0, now(), now()),
  ('3c459625-e499-5ddb-b64d-a442dd21f474', 0, 0, now(), now()),
  ('4d56a736-f5aa-6eec-c75e-b553ee32e585', 0, 0, now(), now())
ON CONFLICT (user_id) DO NOTHING;