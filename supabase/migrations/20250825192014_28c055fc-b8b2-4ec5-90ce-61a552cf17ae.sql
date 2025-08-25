-- Set up cron job for Maya insight generator
SELECT cron.schedule(
  'maya-insight-generator',
  '0 */6 * * *', -- every 6 hours
  $$
  SELECT
    net.http_post(
        url:='https://vzpissitddpunkpythsb.supabase.co/functions/v1/maya-insight-generator',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cGlzc2l0ZGRwdW5rcHl0aHNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3ODUxMDUsImV4cCI6MjA2ODM2MTEwNX0.qm92R4H0_rQpNipa2u1PjJqjnKrlRz_RJe6h6J9G-RI"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);