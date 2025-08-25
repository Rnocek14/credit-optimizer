
-- Ensure extensions (safe if already installed)
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;

-- 1) Unschedule any existing job by name
select cron.unschedule(jobid)
from cron.job
where jobname = 'maya-hourly-insight-generation';

-- 2) Create secure hourly cron job (top of every hour UTC)
--    IMPORTANT: Include both Authorization (anon key) and x-cron-secret to pass edge gateway + your function check
select cron.schedule(
  'maya-hourly-insight-generation',
  '0 * * * *',
  $$
  select
    net.http_post(
      url     := 'https://vzpissitddpunkpythsb.functions.supabase.co/maya-insight-generator',
      headers := jsonb_build_object(
                   'content-type','application/json',
                   'authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cGlzc2l0ZGRwdW5rcHl0aHNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3ODUxMDUsImV4cCI6MjA2ODM2MTEwNX0.qm92R4H0_rQpNipa2u1PjJqjnKrlRz_RJe6h6J9G-RI',
                   'x-cron-secret','pR1v4t3-CR0N-7f9b4a0e0a8e4d4c8cfbb1f8f7a4b9d2a3c9de9d1234abcd'
                 ),
      body    := '{}'::jsonb
    )
  $$
);

-- 3) One-off manual smoke test (runs immediately)
--    Then inspect net._http_response below
select
  net.http_post(
    url     := 'https://vzpissitddpunkpythsb.functions.supabase.co/maya-insight-generator',
    headers := jsonb_build_object(
                 'content-type','application/json',
                 'authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cGlzc2l0ZGRwdW5rcHl0aHNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3ODUxMDUsImV4cCI6MjA2ODM2MTEwNX0.qm92R4H0_rQpNipa2u1PjJqjnKrlRz_RJe6h6J9G-RI',
                 'x-cron-secret','pR1v4t3-CR0N-7f9b4a0e0a8e4d4c8cfbb1f8f7a4b9d2a3c9de9d1234abcd'
               ),
    body    := '{}'::jsonb
  ) as request_id;

-- 4) Observability checks

-- 4a) Show the last 3 HTTP responses (should include a 200 with success:true)
select id, status_code, content_type, created,
       left(content::text, 400) as content_preview, error_msg
from net._http_response
order by created desc
limit 3;

-- 4b) Confirm only the secure job exists and is active
select jobid, jobname, schedule, active
from cron.job
where jobname = 'maya-hourly-insight-generation';

-- 4c) Counts for insights
select count(*) as insights_last_5m
from public.maya_proactive_insights
where created_at > now() - interval '5 minutes';

select count(*) as insights_last_24h
from public.maya_proactive_insights
where created_at > now() - interval '24 hours';
