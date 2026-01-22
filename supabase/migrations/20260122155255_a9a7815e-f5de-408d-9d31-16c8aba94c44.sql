-- Fix permissions: golden_scan_report() should be service-only
REVOKE ALL ON FUNCTION public.golden_scan_report(boolean) FROM public;
REVOKE ALL ON FUNCTION public.golden_scan_report(boolean) FROM authenticated;
REVOKE ALL ON FUNCTION public.golden_scan_report(boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.golden_scan_report(boolean) TO service_role;

-- Create ops_audit_snapshots table for historical audit records
CREATE TABLE IF NOT EXISTS public.ops_audit_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  report jsonb NOT NULL,
  snapshot_type text NOT NULL DEFAULT 'golden_scan',
  triggered_by text
);

ALTER TABLE public.ops_audit_snapshots ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read snapshots (for admin UI)
CREATE POLICY "ops_snapshots_select_authenticated"
  ON public.ops_audit_snapshots
  FOR SELECT
  TO authenticated
  USING (true);

-- Only service_role can insert snapshots (edge functions)
CREATE POLICY "ops_snapshots_insert_service"
  ON public.ops_audit_snapshots
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Index for querying recent snapshots
CREATE INDEX IF NOT EXISTS idx_ops_audit_snapshots_created_at 
  ON public.ops_audit_snapshots(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ops_audit_snapshots_type 
  ON public.ops_audit_snapshots(snapshot_type);

COMMENT ON TABLE public.ops_audit_snapshots IS 'Historical audit snapshots from golden_scan_report() for compliance tracking';