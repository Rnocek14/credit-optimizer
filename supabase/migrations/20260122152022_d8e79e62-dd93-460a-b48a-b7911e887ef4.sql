-- Fix schema mismatch: RPCs were checking for non-existent 'verified' status
-- Actual workflow column is `status` with values: active, draft
-- The `acceptance_status` column is the semantic outcome (accepted, elective, rejected)

-- Drop the incorrectly-named RPCs
DROP FUNCTION IF EXISTS public.count_verified_rules_missing_evidence();
DROP FUNCTION IF EXISTS public.repair_verified_rules_missing_evidence();

-- Create correctly named RPCs that check status='active' (workflow state)
CREATE OR REPLACE FUNCTION public.count_active_rules_missing_evidence()
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER
  FROM credit_transfer_rules
  WHERE status = 'active'
    AND (evidence_url IS NULL OR BTRIM(evidence_url) = '');
$$;

COMMENT ON FUNCTION public.count_active_rules_missing_evidence() IS 
  'Count active transfer rules missing evidence_url for compliance monitoring';

-- Repair function: downgrades active→draft when evidence is missing
CREATE OR REPLACE FUNCTION public.repair_active_rules_missing_evidence()
RETURNS INTEGER
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE credit_transfer_rules
  SET status = 'draft',
      provenance_notes = COALESCE(provenance_notes, '') || 
        CASE WHEN provenance_notes IS NOT NULL AND provenance_notes != '' 
             THEN E'\n' ELSE '' END ||
        '[AUTO-REPAIR ' || NOW()::TEXT || '] Downgraded from active: missing evidence_url',
      last_verified_at = NULL
  WHERE status = 'active'
    AND (evidence_url IS NULL OR BTRIM(evidence_url) = '');
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.repair_active_rules_missing_evidence() IS 
  'Auto-repair: downgrade active rules to draft if missing evidence_url';