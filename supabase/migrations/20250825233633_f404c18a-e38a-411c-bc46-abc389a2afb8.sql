
-- 0) Ensure required extensions (safe if already installed)
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;

-- 1) Unschedule old job (if it exists)
select cron.unschedule(jobid)
from cron.job
where jobname = 'maya-hourly-insight-generation';

-- 2) Create secure hourly cron job (top of every hour UTC)
--    Uses BOTH Authorization (anon key) and x-cron-secret (your exact secret)
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
--    Expect { "success": true, "generatedFor": <number>, "timestamp": ... } in response
select
  net.http_post(
    url     := 'https://vzpissitddpunkpythsb.functions.supabase.co/maya-insight-generator',
    headers := jsonb_build_object(
                 'content-type','application/json',
                 'authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cGlzc2l0ZGRwdW5rcHl0aHNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3ODUxMDUsImV4cCI6MjA2ODM2MTEwNX0.qm92R4H0_rQpNipa2u1PjJqjnKrlRz_RJe6h6J9G-RI',
                 'x-cron-secret','pR1v4t3-CR0N-7f9b4a0e0a8e4d4c8cfbb1f8f7a4b9d2a3c9de9d1234abcd'
               ),
    body    := '{}'::jsonb
  ) as smoke_test_request_id;

-- 4) Observability checks

-- 4a) Last 3 HTTP responses from pg_net (should include a 200 with success:true)
select id, status_code, content_type, created,
       left(content::text, 400) as content_preview, error_msg
from net._http_response
order by created desc
limit 3;

-- 4b) Confirm the secure hourly job exists and is active
select jobid, jobname, schedule, active
from cron.job
where jobname = 'maya-hourly-insight-generation';

-- 4c) Count of new insights written recently
select count(*) as insights_last_5m
from public.maya_proactive_insights
where created_at > now() - interval '5 minutes';

select count(*) as insights_last_24h
from public.maya_proactive_insights
where created_at > now() - interval '24 hours';
