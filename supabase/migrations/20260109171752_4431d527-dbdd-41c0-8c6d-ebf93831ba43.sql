-- Create batch run persistence table for reliable progress tracking
CREATE TABLE IF NOT EXISTS transfer_batch_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier text NOT NULL,
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running', -- running|stopped_early|completed|failed
  last_processed text,
  processed_count int DEFAULT 0,
  successful_count int DEFAULT 0,
  failed_count int DEFAULT 0,
  skipped_count int DEFAULT 0,
  summary jsonb,
  created_at timestamptz DEFAULT now()
);

-- Index for quick lookups
CREATE INDEX idx_batch_runs_tier_started ON transfer_batch_runs(tier, started_at DESC);
CREATE INDEX idx_batch_runs_status ON transfer_batch_runs(status);

-- Enable RLS (service role only)
ALTER TABLE transfer_batch_runs ENABLE ROW LEVEL SECURITY;

-- Only service role can access
CREATE POLICY "Service role full access to batch runs"
  ON transfer_batch_runs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE transfer_batch_runs IS 'Tracks batch scan progress for resumability even when client times out';