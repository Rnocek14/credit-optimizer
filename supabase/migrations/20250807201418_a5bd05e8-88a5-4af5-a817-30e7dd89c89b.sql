-- Create AI model usage logging table
CREATE TABLE IF NOT EXISTS public.ai_model_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL,
  function_name TEXT,
  task TEXT NOT NULL,
  route TEXT,
  model TEXT,
  complexity TEXT,
  latency_ms INTEGER,
  tokens_in INTEGER,
  tokens_out INTEGER,
  success BOOLEAN NOT NULL DEFAULT true,
  request_id TEXT,
  error_message TEXT
);

-- Enable Row Level Security
ALTER TABLE public.ai_model_usage ENABLE ROW LEVEL SECURITY;

-- Service role catch-all policy (consistent with existing schema patterns)
CREATE POLICY "Service role can manage ai model usage"
ON public.ai_model_usage
AS PERMISSIVE
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Users can view their own usage rows
CREATE POLICY "Users can view their own ai model usage"
ON public.ai_model_usage
FOR SELECT
TO public
USING (auth.uid() = user_id);

-- Helpful index for querying by user and time
CREATE INDEX IF NOT EXISTS idx_ai_model_usage_user_created
ON public.ai_model_usage (user_id, created_at DESC);
