-- Create RPC function to get latest invariant snapshot per template with proper pagination
-- Uses window function to ensure correct "latest per template" semantics

CREATE OR REPLACE FUNCTION public.admin_list_latest_invariant_snapshots(
  p_institution_code text DEFAULT NULL,
  p_track text DEFAULT NULL,
  p_decision text DEFAULT NULL,
  p_template_ids uuid[] DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  template_id uuid,
  decision text,
  violation_codes text[],
  violation_count int,
  invariant_version text,
  created_at timestamptz,
  job_id uuid,
  institution_code text,
  track text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH latest_snapshots AS (
    SELECT DISTINCT ON (s.template_id)
      s.template_id,
      s.decision,
      s.violation_codes,
      array_length(s.violation_codes, 1) AS violation_count,
      s.invariant_version,
      s.created_at,
      s.job_id,
      s.institution_code,
      s.track
    FROM invariant_decision_snapshots s
    WHERE 
      (p_institution_code IS NULL OR s.institution_code = p_institution_code)
      AND (p_track IS NULL OR s.track = p_track)
      AND (p_template_ids IS NULL OR s.template_id = ANY(p_template_ids))
    ORDER BY s.template_id, s.created_at DESC
  )
  SELECT 
    ls.template_id,
    ls.decision,
    ls.violation_codes,
    COALESCE(ls.violation_count, 0)::int,
    ls.invariant_version,
    ls.created_at,
    ls.job_id,
    ls.institution_code,
    ls.track
  FROM latest_snapshots ls
  WHERE (p_decision IS NULL OR ls.decision = p_decision)
  ORDER BY ls.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- Create a count function for proper total count
CREATE OR REPLACE FUNCTION public.admin_count_latest_invariant_snapshots(
  p_institution_code text DEFAULT NULL,
  p_track text DEFAULT NULL,
  p_decision text DEFAULT NULL,
  p_template_ids uuid[] DEFAULT NULL
)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH latest_snapshots AS (
    SELECT DISTINCT ON (s.template_id)
      s.template_id,
      s.decision
    FROM invariant_decision_snapshots s
    WHERE 
      (p_institution_code IS NULL OR s.institution_code = p_institution_code)
      AND (p_track IS NULL OR s.track = p_track)
      AND (p_template_ids IS NULL OR s.template_id = ANY(p_template_ids))
    ORDER BY s.template_id, s.created_at DESC
  )
  SELECT COUNT(*)::bigint
  FROM latest_snapshots ls
  WHERE (p_decision IS NULL OR ls.decision = p_decision);
$$;

-- Grant execute to authenticated users (admin check happens in edge function)
GRANT EXECUTE ON FUNCTION public.admin_list_latest_invariant_snapshots TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_count_latest_invariant_snapshots TO authenticated;

COMMENT ON FUNCTION public.admin_list_latest_invariant_snapshots IS 
'Returns the latest invariant snapshot per template with correct pagination semantics. Admin-only (enforced in edge function).';

COMMENT ON FUNCTION public.admin_count_latest_invariant_snapshots IS 
'Returns count of templates with snapshots matching filters. Used for pagination total.';
