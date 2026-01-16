-- Invariant Decision Snapshots: Immutable audit trail for template generation decisions
-- Records the exact invariant config used at evaluation time

CREATE TABLE public.invariant_decision_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Linkage to generation context
  job_id uuid NULL,
  template_id uuid NULL,
  institution_code text NOT NULL,
  program_catalog_id uuid NULL,
  track text NULL,

  -- Context at decision time
  template_status text NOT NULL,
  invariant_version text NOT NULL,

  -- Snapshot of effective config (SOURCE OF TRUTH - never recompute)
  effective_config jsonb NOT NULL,

  -- Outcome
  decision text NOT NULL CHECK (decision IN ('pass', 'warn', 'block')),
  violation_codes text[] NOT NULL DEFAULT '{}',

  -- Immutable timestamp
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for common query patterns
CREATE INDEX idx_invariant_snapshots_institution ON public.invariant_decision_snapshots(institution_code);
CREATE INDEX idx_invariant_snapshots_template ON public.invariant_decision_snapshots(template_id) WHERE template_id IS NOT NULL;
CREATE INDEX idx_invariant_snapshots_job ON public.invariant_decision_snapshots(job_id) WHERE job_id IS NOT NULL;
CREATE INDEX idx_invariant_snapshots_created ON public.invariant_decision_snapshots(created_at DESC);

-- Enable RLS
ALTER TABLE public.invariant_decision_snapshots ENABLE ROW LEVEL SECURITY;

-- Append-only: Edge functions insert via service role, no user inserts
-- Read: Admins only (using has_role function)
CREATE POLICY "Admins can view all snapshots"
  ON public.invariant_decision_snapshots
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- No UPDATE/DELETE policies - snapshots are immutable
-- Inserts happen via service role in edge functions (bypasses RLS)

-- Add comment for documentation
COMMENT ON TABLE public.invariant_decision_snapshots IS 'Immutable audit trail: stores exact invariant config used for each template evaluation. Never modify existing rows.';