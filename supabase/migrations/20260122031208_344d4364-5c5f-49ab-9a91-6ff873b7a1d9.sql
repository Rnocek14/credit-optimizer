-- Change history audit table: "black box flight recorder" for policy change detection
CREATE TABLE public.policy_change_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- What changed
  template_id UUID NOT NULL,
  institution_code TEXT NOT NULL,
  url TEXT NOT NULL,
  hash_before TEXT,
  hash_after TEXT,
  content_changed BOOLEAN NOT NULL DEFAULT false,
  first_hash BOOLEAN NOT NULL DEFAULT false,
  
  -- Detection context
  scan_run_id TEXT, -- Links events from same scan
  http_status INTEGER,
  content_length INTEGER,
  
  -- Trigger decision
  trigger_attempted BOOLEAN NOT NULL DEFAULT false,
  trigger_succeeded BOOLEAN,
  skip_reason TEXT, -- 'active_task', 'cooldown', 'dry_run', 'first_hash', null if triggered
  
  -- Resulting action
  batch_run_id UUID, -- Links to transfer_batch_runs if triggered
  task_id UUID -- Links to policy_refresh_tasks if created
);

-- Indexes for common queries
CREATE INDEX idx_policy_change_audit_institution ON public.policy_change_audit(institution_code);
CREATE INDEX idx_policy_change_audit_created_at ON public.policy_change_audit(created_at DESC);
CREATE INDEX idx_policy_change_audit_template ON public.policy_change_audit(template_id);
CREATE INDEX idx_policy_change_audit_content_changed ON public.policy_change_audit(content_changed) WHERE content_changed = true;
CREATE INDEX idx_policy_change_audit_scan_run ON public.policy_change_audit(scan_run_id);

-- Enable RLS
ALTER TABLE public.policy_change_audit ENABLE ROW LEVEL SECURITY;

-- Admin-only access (service role can always access)
CREATE POLICY "Admins can view audit logs"
ON public.policy_change_audit
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- Add comment for documentation
COMMENT ON TABLE public.policy_change_audit IS 'Flight recorder for policy change detection - tracks what changed, when, and trigger decisions';
COMMENT ON COLUMN public.policy_change_audit.skip_reason IS 'Why rebuild was not triggered: active_task, cooldown, dry_run, first_hash, or null if triggered';