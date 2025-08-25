
-- 0) Ensure required extensions (safe if already installed)
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;

-- 1) Unschedule old insecure job (if it exists)
select cron.unschedule(jobid)
from cron.job
where jobname = 'maya-hourly-insight-generation';

-- 2) Create secure hourly cron job (top of every hour UTC)
--    Calls the edge function with x-cron-secret header and empty JSON body
select cron.schedule(
  'maya-hourly-insight-generation',
  '0 * * * *',
  $$
  select
    net.http_post(
      url     := 'https://vzpissitddpunkpythsb.functions.supabase.co/maya-insight-generator',
      headers := jsonb_build_object(
                   'content-type','application/json',
                   'x-cron-secret','pR1v4t3-CR0N-...'
                 ),
      body    := '{}'::jsonb
    )
  $$
);

-- 3) One-off manual smoke test (runs immediately)
--    Expect a JSON response with success:true and generatedFor > 0
select
  net.http_post(
    url     := 'https://vzpissitddpunkpythsb.functions.supabase.co/maya-insight-generator',
    headers := jsonb_build_object(
                 'content-type','application/json',
                 'x-cron-secret','pR1v4t3-CR0N-...'
               ),
    body    := '{}'::jsonb
  ) as smoke_test_response;

-- 4) Observability checks

-- 4a) Confirm only the secure job exists and is active
select jobid, jobname, schedule, active
from cron.job
where jobname = 'maya-hourly-insight-generation';

-- 4b) Count of new insights in last 5 minutes (should be >= 1 after smoke test)
select count(*) as insights_last_5m
from public.maya_proactive_insights
where created_at > now() - interval '5 minutes';

-- 4c) Count of insights in last 24 hours
select count(*) as insights_last_24h
from public.maya_proactive_insights
where created_at > now() - interval '24 hours';
