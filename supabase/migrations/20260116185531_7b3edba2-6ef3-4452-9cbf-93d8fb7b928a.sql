-- Add id DESC tiebreaker to count RPC for deterministic consistency with list RPC
CREATE OR REPLACE FUNCTION public.admin_count_latest_invariant_snapshots(
  p_institution_code TEXT DEFAULT NULL,
  p_track TEXT DEFAULT NULL,
  p_template_ids UUID[] DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)
  FROM (
    SELECT DISTINCT ON (s.template_id) s.template_id
    FROM invariant_decision_snapshots s
    WHERE (p_institution_code IS NULL OR s.institution_code = p_institution_code)
      AND (p_track IS NULL OR s.track = p_track)
      AND (p_template_ids IS NULL OR s.template_id = ANY(p_template_ids))
    ORDER BY s.template_id, s.created_at DESC, s.id DESC
  ) AS unique_templates;
$$;