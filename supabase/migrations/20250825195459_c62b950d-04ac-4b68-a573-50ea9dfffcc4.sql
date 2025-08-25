-- Enable pg_cron extension for scheduling Maya insight generation
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a secure cron job that runs Maya insight generation every hour
-- Using service role instead of exposed anon key for security
SELECT cron.schedule(
  'maya-hourly-insight-generation',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://vzpissitddpunkpythsb.supabase.co/functions/v1/maya-insight-generator',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
        body:='{"source": "cron_job", "timestamp": "' || now() || '"}'::jsonb
    ) as request_id;
  $$
);

-- Add AI model usage tracking table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.ai_model_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    function_name TEXT NOT NULL,
    model TEXT,
    tokens_in INTEGER,
    tokens_out INTEGER,
    latency_ms INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on ai_model_usage_logs
ALTER TABLE public.ai_model_usage_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for ai_model_usage_logs
CREATE POLICY "Users can view their own AI usage logs" ON public.ai_model_usage_logs
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all AI usage logs" ON public.ai_model_usage_logs
FOR ALL USING (true);

-- Add rate limiting table for Maya functions
CREATE TABLE IF NOT EXISTS public.maya_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    function_name TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, function_name, window_start)
);

-- Enable RLS on maya_rate_limits
ALTER TABLE public.maya_rate_limits ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for maya_rate_limits
CREATE POLICY "Users can view their own rate limits" ON public.maya_rate_limits
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all rate limits" ON public.maya_rate_limits
FOR ALL USING (true);