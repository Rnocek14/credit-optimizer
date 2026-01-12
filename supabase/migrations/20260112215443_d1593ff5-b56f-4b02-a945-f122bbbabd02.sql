-- Phase A: Database Schema Extensions for Policy Refresh Pipeline
-- This migration adds structure only - no behavior changes

-- 1. Extend scrape_url_templates with source management fields
ALTER TABLE scrape_url_templates 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS last_hash text,
ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'transfer_policy' CHECK (source_type IN ('transfer_policy', 'catalog', 'residency', 'alt_credit', 'equivalency_table', 'other'));

-- 2. Extend transfer_batch_runs with run metadata
ALTER TABLE transfer_batch_runs 
ADD COLUMN IF NOT EXISTS run_type text DEFAULT 'manual' CHECK (run_type IN ('manual', 'scheduled')),
ADD COLUMN IF NOT EXISTS started_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS urls_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS institutions_count integer DEFAULT 0;

-- 3. Create policy_refresh_tasks table (per-institution task tracking)
CREATE TABLE IF NOT EXISTS policy_refresh_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES transfer_batch_runs(id) ON DELETE CASCADE,
  institution text NOT NULL,
  status text DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'complete', 'blocked', 'failed')),
  reason text,
  started_at timestamptz,
  completed_at timestamptz,
  metrics jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(run_id, institution)
);

-- 4. Create policy_refresh_diffs table (audit trail for old vs new values)
CREATE TABLE IF NOT EXISTS policy_refresh_diffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES transfer_batch_runs(id) ON DELETE CASCADE,
  institution text NOT NULL,
  field_name text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  old_confidence numeric,
  new_confidence numeric,
  action text CHECK (action IN ('unchanged', 'updated', 'added', 'removed', 'conflict')),
  created_at timestamptz DEFAULT now()
);

-- 5. Extend institution_policy_packs with stale/blocked tracking
ALTER TABLE institution_policy_packs 
ADD COLUMN IF NOT EXISTS stale boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS blocked_reason text,
ADD COLUMN IF NOT EXISTS last_run_id uuid;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_policy_refresh_tasks_run_id ON policy_refresh_tasks(run_id);
CREATE INDEX IF NOT EXISTS idx_policy_refresh_tasks_institution ON policy_refresh_tasks(institution);
CREATE INDEX IF NOT EXISTS idx_policy_refresh_tasks_status ON policy_refresh_tasks(status);
CREATE INDEX IF NOT EXISTS idx_policy_refresh_diffs_run_id ON policy_refresh_diffs(run_id);
CREATE INDEX IF NOT EXISTS idx_policy_refresh_diffs_institution ON policy_refresh_diffs(institution);
CREATE INDEX IF NOT EXISTS idx_institution_policy_packs_stale ON institution_policy_packs(stale) WHERE stale = true;

-- 7. RLS Policies for new tables (admin-only access)

-- Enable RLS on new tables
ALTER TABLE policy_refresh_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_refresh_diffs ENABLE ROW LEVEL SECURITY;

-- policy_refresh_tasks: Admin read/write only
CREATE POLICY "Admin can manage policy refresh tasks"
ON policy_refresh_tasks
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- policy_refresh_diffs: Admin read only
CREATE POLICY "Admin can view policy refresh diffs"
ON policy_refresh_diffs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admin can insert policy refresh diffs"
ON policy_refresh_diffs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Service role bypass for edge functions
CREATE POLICY "Service role can manage policy refresh tasks"
ON policy_refresh_tasks
FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage policy refresh diffs"
ON policy_refresh_diffs
FOR ALL
USING (auth.role() = 'service_role');