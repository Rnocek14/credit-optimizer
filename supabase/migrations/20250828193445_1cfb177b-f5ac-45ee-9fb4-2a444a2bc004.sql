-- Create edge_invocations table for rate limiting
CREATE TABLE public.edge_invocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for efficient rate limiting queries
CREATE INDEX idx_edge_invocations_identifier_created_at ON public.edge_invocations (identifier, created_at);

-- Enable RLS
ALTER TABLE public.edge_invocations ENABLE ROW LEVEL SECURITY;

-- Only service role can manage edge invocations (used for rate limiting)
CREATE POLICY "edge_invocations_service_only" ON public.edge_invocations
FOR ALL
USING (false)  -- No user access, only service role via edge functions
WITH CHECK (false);