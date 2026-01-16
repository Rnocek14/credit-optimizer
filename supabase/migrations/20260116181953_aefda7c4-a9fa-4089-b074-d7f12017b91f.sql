-- Fix RPC with deterministic ordering using unique tiebreaker (id)
-- This prevents unstable pagination when timestamps collide in batch writes

CREATE OR REPLACE FUNCTION public.admin_list_latest_invariant_snapshots(
  p_institution_code text DEFAULT NULL,
  p_track text DEFAULT NULL,
  p_decision text DEFAULT NULL,
  p_template_ids uuid[] DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  template_id uuid,
  decision text,
  violation_codes text[],
  violation_count integer,
  invariant_version text,
  created_at timestamp with time zone,
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
      s.id,  -- Include for stable tiebreaker
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
    ORDER BY s.template_id, s.created_at DESC, s.id DESC  -- id as final tiebreaker
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
  ORDER BY ls.created_at DESC, ls.template_id, ls.id DESC  -- Stable paging with unique tiebreaker
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.admin_list_latest_invariant_snapshots TO authenticated;