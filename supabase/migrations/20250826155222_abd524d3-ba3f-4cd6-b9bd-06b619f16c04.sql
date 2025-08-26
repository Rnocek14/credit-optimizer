
-- 0) Ensure required extensions (no-op if already present)
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;

-- 1) Unschedule any existing job for the generator
select cron.unschedule(jobid)
from cron.job
where jobname = 'maya-hourly-insight-generation';

-- 2) Re-create the cron job: run 2 minutes past every hour with a 30s timeout
select cron.schedule(
  'maya-hourly-insight-generation',
  '2 * * * *',
  $$
  select net.http_post(
    url                  := 'https://vzpissitddpunkpythsb.functions.supabase.co/maya-insight-generator',
    headers              := '{
      "Content-Type": "application/json",
      "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cGlzc2l0ZGRwdW5rcHl0aHNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3ODUxMDUsImV4cCI6MjA2ODM2MTEwNX0.qm92R4H0_rQpNipa2u1PjJqjnKrlRz_RJe6h6J9G-RI"
    }'::jsonb,
    body                 := '{}'::jsonb,
    timeout_milliseconds := 30000
  )
  $$
);

-- 3) Seed minimal recent activity for the three dev users (safe to run multiple times)
insert into public.maya_context_tracking (id, user_id, context_type, event_type, context_data, created_at)
values
  (gen_random_uuid(), '2b458624-d498-4cca-a63d-9341cc20e363'::uuid, 'page_visit', 'qa_seed', '{"path":"/today"}'::jsonb, now()),
  (gen_random_uuid(), '3c459625-e499-5ddb-b64d-a442dd21f474'::uuid, 'page_visit', 'qa_seed', '{"path":"/plan"}'::jsonb, now()),
  (gen_random_uuid(), '4d56a736-f5aa-6eec-c75e-b553ee32e585'::uuid, 'page_visit', 'qa_seed', '{"path":"/explore"}'::jsonb, now());
