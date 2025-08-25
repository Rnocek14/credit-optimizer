-- Ensure pg_net is available for HTTP calls from cron
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Recreate secure hourly cron using anon key (JWT) and no secrets in SQL
DO $$ BEGIN
  PERFORM cron.unschedule('maya-hourly-insight-generation');
EXCEPTION WHEN OTHERS THEN
  -- ignore if doesn't exist
  NULL;
END $$;

SELECT cron.schedule(
  'maya-hourly-insight-generation',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://vzpissitddpunkpythsb.supabase.co/functions/v1/maya-insight-generator',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cGlzc2l0ZGRwdW5rcHl0aHNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3ODUxMDUsImV4cCI6MjA2ODM2MTEwNX0.qm92R4H0_rQpNipa2u1PjJqjnKrlRz_RJe6h6J9G-RI"}'::jsonb,
    body := '{"source":"cron_job"}'::jsonb
  );
  $$
);
