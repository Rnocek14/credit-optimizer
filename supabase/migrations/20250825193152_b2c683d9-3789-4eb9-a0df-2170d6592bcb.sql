-- Remove the insecure cron job
SELECT cron.unschedule('maya-insight-generator');

-- Create a secure cron job using service role authentication
SELECT cron.schedule(
  'maya-insight-generator-secure',
  '0 */6 * * *', -- every 6 hours
  $$
  SELECT
    net.http_post(
        url:='https://vzpissitddpunkpythsb.supabase.co/functions/v1/maya-insight-generator',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);