-- Create transfer truth slots RPC function (parameterized, index-optimized)
CREATE OR REPLACE FUNCTION get_transfer_truth_slots(
  p_program_code TEXT,
  p_institution_code TEXT DEFAULT NULL
)
RETURNS TABLE (
  template_id TEXT,
  institution_code TEXT,
  program_code TEXT,
  track_type TEXT,
  slot_id TEXT,
  requirement_area TEXT,
  provider_norm TEXT,
  course_norm TEXT,
  acceptance_status TEXT,
  target_course_code TEXT,
  status_bucket TEXT,
  placement_missing BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH alt_slots AS (
    SELECT
      dt.id AS template_id,
      dt.institution_code,
      dt.program_code,
      dt.track_type,
      s->>'slotId' AS slot_id,
      s->>'requirementArea' AS requirement_area,
      UPPER(COALESCE(s->'preferred'->>'sourceCode','')) AS provider_norm,
      LOWER(COALESCE(s->'preferred'->>'identifier','')) AS course_norm
    FROM degree_templates dt,
         jsonb_array_elements(dt.template_data->'terms') t,
         jsonb_array_elements(t->'slots') s
    WHERE dt.program_code = p_program_code
      AND (p_institution_code IS NULL OR dt.institution_code = p_institution_code)
      AND s->'preferred'->>'type' = 'alt_credit'
  ),
  joined AS (
    SELECT
      a.template_id,
      a.institution_code,
      a.program_code,
      a.track_type,
      a.slot_id,
      a.requirement_area,
      a.provider_norm,
      a.course_norm,
      r.acceptance_status,
      r.target_course_code
    FROM alt_slots a
    LEFT JOIN credit_transfer_rules r
      ON r.target_institution_norm = a.institution_code
     AND r.source_institution_norm = a.provider_norm
     AND r.source_course_code_norm = a.course_norm
  ),
  classified AS (
    SELECT
      j.template_id,
      j.institution_code,
      j.program_code,
      j.track_type,
      j.slot_id,
      j.requirement_area,
      j.provider_norm,
      j.course_norm,
      j.acceptance_status,
      j.target_course_code,
      CASE
        WHEN j.acceptance_status IS NULL THEN 'missing'
        WHEN j.acceptance_status ILIKE '%deny%' OR j.acceptance_status ILIKE '%reject%' OR j.acceptance_status ILIKE '%not accept%' THEN 'denied'
        WHEN j.acceptance_status ILIKE '%review%' OR j.acceptance_status ILIKE '%unknown%' OR j.acceptance_status ILIKE '%verify%' THEN 'needs_review'
        WHEN j.acceptance_status ILIKE '%elective%' THEN 'elective_only'
        WHEN j.acceptance_status ILIKE '%accept%' THEN 'accepted'
        ELSE 'other'
      END AS status_bucket,
      CASE
        WHEN j.acceptance_status ILIKE '%accept%'
         AND (j.target_course_code IS NULL OR length(trim(j.target_course_code))=0)
        THEN true
        ELSE false
      END AS placement_missing
    FROM joined j
  )
  SELECT * FROM classified;
END;
$$;

-- Add index to speed up the norm-based joins if not exists
CREATE INDEX IF NOT EXISTS idx_ctr_norm_lookup 
ON credit_transfer_rules(target_institution_norm, source_institution_norm, source_course_code_norm);

COMMENT ON FUNCTION get_transfer_truth_slots IS 'Returns classified alt-credit slots with transfer rule status for truth scanning';