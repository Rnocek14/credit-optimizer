-- Policy Pack Promotion Workflow: Step 1 (Fixed schema)
-- Create a view for promotion candidates with gate status computation

-- Add has_ground_truth flag if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'institution_policy_packs' AND column_name = 'has_ground_truth'
  ) THEN
    ALTER TABLE institution_policy_packs 
    ADD COLUMN has_ground_truth boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Add completeness_score if not exists (using confidence_score as base)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'institution_policy_packs' AND column_name = 'completeness_score'
  ) THEN
    ALTER TABLE institution_policy_packs 
    ADD COLUMN completeness_score integer;
    -- Initialize from confidence_score
    UPDATE institution_policy_packs SET completeness_score = confidence_score WHERE completeness_score IS NULL;
  END IF;
END $$;

-- Add promoted_at timestamp for audit trail
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'institution_policy_packs' AND column_name = 'promoted_at'
  ) THEN
    ALTER TABLE institution_policy_packs 
    ADD COLUMN promoted_at timestamptz;
  END IF;
END $$;

-- Add promoted_by for audit trail
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'institution_policy_packs' AND column_name = 'promoted_by'
  ) THEN
    ALTER TABLE institution_policy_packs 
    ADD COLUMN promoted_by uuid;
  END IF;
END $$;

-- Create the promotion candidates view with security_invoker
CREATE OR REPLACE VIEW v_policy_pack_promotion_candidates
WITH (security_invoker = on) AS
SELECT 
  ipp.id AS pack_id,
  ipp.institution AS institution_code,
  i.name AS institution_name,
  ipp.pack_scope AS program_code,
  ipp.degree_level,
  ipp.status,
  COALESCE(ipp.has_ground_truth, false) AS has_ground_truth,
  COALESCE(ipp.completeness_score, ipp.confidence_score, 0) AS completeness_score,
  ipp.academic_year AS catalog_year,
  ipp.created_at,
  ipp.updated_at,
  ipp.promoted_at,
  ipp.stale,
  ipp.blocked_reason,
  -- Gate status computation (mirrors evaluatePolicyGate logic)
  CASE 
    WHEN COALESCE(ipp.completeness_score, ipp.confidence_score, 0) >= 80 
         AND COALESCE(ipp.has_ground_truth, false) THEN 'green'
    WHEN COALESCE(ipp.completeness_score, ipp.confidence_score, 0) >= 60 THEN 'yellow'
    ELSE 'red'
  END AS gate_status,
  -- Promotion eligibility
  CASE 
    WHEN ipp.status = 'active' THEN false -- Already promoted
    WHEN ipp.blocked_reason IS NOT NULL THEN false -- Blocked
    WHEN COALESCE(ipp.completeness_score, ipp.confidence_score, 0) < 60 THEN false -- Red gate blocks
    ELSE true -- Green or yellow can be promoted
  END AS is_promotable,
  -- Auto-promotion eligibility (green + ground truth)
  CASE 
    WHEN COALESCE(ipp.completeness_score, ipp.confidence_score, 0) >= 80 
         AND COALESCE(ipp.has_ground_truth, false) THEN true
    ELSE false
  END AS is_auto_promotable,
  -- Reason for current state
  CASE 
    WHEN ipp.status = 'active' THEN 'Already active'
    WHEN ipp.blocked_reason IS NOT NULL THEN 'Blocked: ' || ipp.blocked_reason
    WHEN COALESCE(ipp.completeness_score, ipp.confidence_score, 0) < 60 THEN 'Completeness score too low (< 60)'
    WHEN NOT COALESCE(ipp.has_ground_truth, false) 
         AND COALESCE(ipp.completeness_score, ipp.confidence_score, 0) < 80 THEN 'Missing ground truth verification'
    WHEN COALESCE(ipp.completeness_score, ipp.confidence_score, 0) >= 80 
         AND COALESCE(ipp.has_ground_truth, false) THEN 'Ready for auto-promotion'
    WHEN COALESCE(ipp.completeness_score, ipp.confidence_score, 0) >= 60 THEN 'Can promote manually (yellow gate)'
    ELSE 'Unknown'
  END AS promotion_reason,
  -- Count of templates generated from this pack
  (
    SELECT COUNT(*) 
    FROM degree_templates dt 
    WHERE dt.institution_code = ipp.institution 
  ) AS templates_count,
  -- Count of active templates
  (
    SELECT COUNT(*) 
    FROM degree_templates dt 
    WHERE dt.institution_code = ipp.institution 
    AND dt.status = 'active'
  ) AS active_templates_count
FROM institution_policy_packs ipp
LEFT JOIN institutions i ON i.code = ipp.institution
ORDER BY 
  CASE WHEN ipp.status = 'draft' THEN 0 ELSE 1 END, -- Drafts first
  COALESCE(ipp.completeness_score, ipp.confidence_score, 0) DESC,
  ipp.updated_at DESC;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_policy_packs_status_score 
ON institution_policy_packs (status, completeness_score DESC NULLS LAST);

COMMENT ON VIEW v_policy_pack_promotion_candidates IS 
'Promotion candidate view for policy packs. 
Gate status: green (>=80 + ground_truth), yellow (>=60), red (<60).
Auto-promotable: green gate only.
Manual-promotable: yellow gate allowed with review warning.';