-- Demo user setup for Quick Start functionality
-- This creates necessary quota and referral entries for demo accounts

-- Demo users (these are the known demo user IDs from the existing system)
WITH demo_users AS (
  SELECT id as user_id
  FROM auth.users
  WHERE id IN (
    '2b458624-d498-4cca-a63d-9341cc20e363',
    '3c459625-e499-5ddb-b64d-a442dd21f474', 
    '4d56a736-f5aa-6eec-c75e-b553ee32e585'
  )
)

-- Insert usage quotas for current month (allows 3 analyses, 0 used)
INSERT INTO public.usage_quotas (
  user_id, 
  period_start, 
  period_end, 
  maya_analyses_used, 
  maya_analyses_limit,
  created_at,
  updated_at
)
SELECT 
  d.user_id,
  date_trunc('month', now()),
  (date_trunc('month', now()) + interval '1 month') - interval '1 second',
  0, 
  3,
  now(),
  now()
FROM demo_users d
ON CONFLICT (user_id, period_start) 
DO UPDATE SET 
  maya_analyses_limit = 3,
  updated_at = now();

-- Insert referral codes (trigger will auto-generate the code)
INSERT INTO public.referrals (user_id, created_at, updated_at)
SELECT d.user_id, now(), now()
FROM demo_users d
ON CONFLICT (user_id) DO NOTHING;