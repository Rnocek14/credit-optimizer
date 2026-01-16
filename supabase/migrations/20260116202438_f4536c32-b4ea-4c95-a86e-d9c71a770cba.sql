-- ============================================
-- Bulk Rerun Jobs + Queue Tables
-- ============================================

-- Table: bulk_rerun_jobs (tracks a single bulk rerun operation)
CREATE TABLE public.bulk_rerun_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'canceled')) DEFAULT 'queued',
  filter jsonb NOT NULL DEFAULT '{}',
  total int NOT NULL DEFAULT 0,
  processed int NOT NULL DEFAULT 0,
  succeeded int NOT NULL DEFAULT 0,
  failed int NOT NULL DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  last_heartbeat_at timestamptz,
  error text
);

-- Table: bulk_rerun_queue (individual template queue items)
CREATE TABLE public.bulk_rerun_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES bulk_rerun_jobs(id) ON DELETE CASCADE,
  template_id uuid NOT NULL,
  status text NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'skipped')) DEFAULT 'queued',
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  started_at timestamptz,
  completed_at timestamptz,
  snapshot_id uuid,
  CONSTRAINT unique_job_template UNIQUE (job_id, template_id)
);

-- Add bulk_job_id column to invariant_decision_snapshots
ALTER TABLE public.invariant_decision_snapshots
ADD COLUMN IF NOT EXISTS bulk_job_id uuid REFERENCES bulk_rerun_jobs(id) ON DELETE SET NULL;

-- ============================================
-- Indexes
-- ============================================

-- bulk_rerun_jobs indexes
CREATE INDEX idx_bulk_rerun_jobs_created_at ON bulk_rerun_jobs(created_at DESC);
CREATE INDEX idx_bulk_rerun_jobs_status_created ON bulk_rerun_jobs(status, created_at DESC);
CREATE INDEX idx_bulk_rerun_jobs_created_by ON bulk_rerun_jobs(created_by);

-- bulk_rerun_queue indexes
CREATE INDEX idx_bulk_rerun_queue_job_status ON bulk_rerun_queue(job_id, status);
CREATE INDEX idx_bulk_rerun_queue_job_completed ON bulk_rerun_queue(job_id, completed_at DESC);
CREATE INDEX idx_bulk_rerun_queue_status ON bulk_rerun_queue(status);

-- invariant_decision_snapshots bulk_job_id index
CREATE INDEX IF NOT EXISTS idx_invariant_snapshots_bulk_job ON invariant_decision_snapshots(bulk_job_id, created_at DESC)
WHERE bulk_job_id IS NOT NULL;

-- ============================================
-- RLS Policies
-- ============================================

-- Enable RLS
ALTER TABLE bulk_rerun_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_rerun_queue ENABLE ROW LEVEL SECURITY;

-- Admin-only SELECT for bulk_rerun_jobs
CREATE POLICY "Admins can view bulk rerun jobs"
ON bulk_rerun_jobs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Admin-only SELECT for bulk_rerun_queue
CREATE POLICY "Admins can view bulk rerun queue"
ON bulk_rerun_queue FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Note: INSERTs/UPDATEs handled by service role in edge functions