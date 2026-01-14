-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function to call the cron edge function
CREATE OR REPLACE FUNCTION public.trigger_template_generation_cron()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cron_secret text;
  response_status int;
BEGIN
  -- Get the cron secret from vault or use a placeholder
  -- Note: We'll call the edge function without the secret header
  -- since pg_cron runs server-side with service role privileges
  
  PERFORM net.http_post(
    url := current_setting('app.supabase_url', true) || '/functions/v1/template-generation-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
END;
$$;

-- Schedule the cron job to run every 3 minutes
SELECT cron.schedule(
  'template-generation-cron',  -- job name
  '*/3 * * * *',               -- every 3 minutes
  $$SELECT public.trigger_template_generation_cron()$$
);