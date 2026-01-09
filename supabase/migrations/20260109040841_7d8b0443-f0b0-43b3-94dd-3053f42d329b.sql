-- =============================================================================
-- SHARP EDGE FIXES: Final production-grade enforcement
-- =============================================================================

-- 1. FIX AUDIT LOG RLS - use auth.role() for service_role check
DROP POLICY IF EXISTS "Service role can insert audit logs" ON policy_merge_audit_log;

CREATE POLICY "Service role can insert audit logs"
ON policy_merge_audit_log
FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'service_role');

-- Also allow anon with service_role (edge functions sometimes use anon key with service role)
CREATE POLICY "Service role anon can insert audit logs"
ON policy_merge_audit_log
FOR INSERT
TO anon
WITH CHECK (auth.role() = 'service_role');

-- 2. ADD UNIQUENESS CONSTRAINT ON GROUND TRUTH
-- First check for and remove duplicates if any
DELETE FROM institution_policy_ground_truth a
USING institution_policy_ground_truth b
WHERE a.id < b.id 
AND UPPER(a.institution) = UPPER(b.institution);

-- Add unique constraint
ALTER TABLE institution_policy_ground_truth
DROP CONSTRAINT IF EXISTS institution_policy_ground_truth_institution_unique;

ALTER TABLE institution_policy_ground_truth
ADD CONSTRAINT institution_policy_ground_truth_institution_unique 
UNIQUE (institution);

-- 3. ENFORCE NOT NULL ON INSTITUTION COLUMNS
-- Update any NULLs first (shouldn't exist but be safe)
UPDATE institution_policy_packs SET institution = 'UNKNOWN' WHERE institution IS NULL;
UPDATE institution_policy_ground_truth SET institution = 'UNKNOWN' WHERE institution IS NULL;

ALTER TABLE institution_policy_packs
ALTER COLUMN institution SET NOT NULL;

ALTER TABLE institution_policy_ground_truth
ALTER COLUMN institution SET NOT NULL;

-- 4. PARTIAL UNIQUE INDEX: Only one active pack per institution
CREATE UNIQUE INDEX IF NOT EXISTS idx_institution_policy_packs_one_active 
ON institution_policy_packs (institution) 
WHERE status IN ('active', 'approved');

-- 5. RECREATE TRIGGER FUNCTION WITH ALL FIXES
DROP TRIGGER IF EXISTS validate_policy_pack_before_approve ON institution_policy_packs;
DROP FUNCTION IF EXISTS validate_policy_pack_approval();

CREATE OR REPLACE FUNCTION validate_policy_pack_approval()
RETURNS TRIGGER AS $$
DECLARE
  residency_val INTEGER;
  max_transfer_val INTEGER;
  gt_residency INTEGER;
  gt_max_transfer INTEGER;
  residency_source TEXT;
  max_transfer_source TEXT;
  gt_exists BOOLEAN;
BEGIN
  -- Extract critical values from policy_json
  residency_val := (NEW.policy_json->'residency_policy'->>'min_institutional_credits')::INTEGER;
  max_transfer_val := (NEW.policy_json->'transfer_credit_limits'->>'max_total_transfer_credits')::INTEGER;

  -- =========================================================================
  -- INSERT GATE: Only allow draft/human_review status on INSERT
  -- (prevents accidental direct inserts as approved)
  -- =========================================================================
  IF TG_OP = 'INSERT' AND NEW.status IN ('active', 'approved') THEN
    RAISE EXCEPTION 'Cannot insert directly as approved/active. Insert as draft first, then update.';
  END IF;

  -- =========================================================================
  -- RANGE VALIDATION (applies to ALL operations)
  -- =========================================================================
  IF residency_val IS NOT NULL AND (residency_val < 0 OR residency_val > 60) THEN
    RAISE EXCEPTION 'Invalid residency credits: % (must be 0-60)', residency_val;
  END IF;
  
  IF max_transfer_val IS NOT NULL AND (max_transfer_val < 0 OR max_transfer_val > 120) THEN
    RAISE EXCEPTION 'Invalid max transfer credits: % (must be 0-120)', max_transfer_val;
  END IF;

  -- =========================================================================
  -- APPROVAL GATES (only for approved/active status)
  -- =========================================================================
  IF NEW.status IN ('active', 'approved') THEN
    
    -- GATE 1: Critical field VALUES must exist (not just provenance)
    IF residency_val IS NULL THEN
      RAISE EXCEPTION 'Approved packs must include residency credits value (got NULL)';
    END IF;

    IF max_transfer_val IS NULL THEN
      RAISE EXCEPTION 'Approved packs must include max transfer credits value (got NULL)';
    END IF;

    -- GATE 2: Provenance must exist and not be empty
    IF NEW.field_provenance IS NULL OR NEW.field_provenance = '{}'::jsonb THEN
      RAISE EXCEPTION 'Approved packs must include field_provenance tracking';
    END IF;

    -- GATE 3: Critical fields must have ground_truth or human_override source
    residency_source := NEW.field_provenance->'residency_policy.min_institutional_credits'->>'source';
    max_transfer_source := NEW.field_provenance->'transfer_credit_limits.max_total_transfer_credits'->>'source';

    IF residency_source IS NULL OR residency_source NOT IN ('ground_truth', 'human_override') THEN
      RAISE EXCEPTION 'Residency credits must be ground_truth or human_override for approved packs (got: %)', COALESCE(residency_source, 'missing');
    END IF;

    IF max_transfer_source IS NULL OR max_transfer_source NOT IN ('ground_truth', 'human_override') THEN
      RAISE EXCEPTION 'Max transfer credits must be ground_truth or human_override for approved packs (got: %)', COALESCE(max_transfer_source, 'missing');
    END IF;

    -- GATE 4: Check if ground truth exists for this institution
    SELECT EXISTS(
      SELECT 1 FROM institution_policy_ground_truth 
      WHERE UPPER(institution) = UPPER(NEW.institution)
    ) INTO gt_exists;

    -- GATE 5: If ground truth exists, values MUST match exactly
    IF gt_exists THEN
      SELECT residency_credits, max_transfer_credits 
      INTO gt_residency, gt_max_transfer
      FROM institution_policy_ground_truth 
      WHERE UPPER(institution) = UPPER(NEW.institution);

      IF gt_residency IS NOT NULL AND residency_val IS DISTINCT FROM gt_residency THEN
        RAISE EXCEPTION '% residency must be %, got % (ground truth mismatch)', 
          NEW.institution, gt_residency, residency_val;
      END IF;

      IF gt_max_transfer IS NOT NULL AND max_transfer_val IS DISTINCT FROM gt_max_transfer THEN
        RAISE EXCEPTION '% max transfer must be %, got % (ground truth mismatch)', 
          NEW.institution, gt_max_transfer, max_transfer_val;
      END IF;
    END IF;

    -- GATE 6: STRICT MODE - Require ground truth to exist for approval
    -- (Comment out this block if you want to allow human_override without ground truth)
    IF NOT gt_exists THEN
      RAISE EXCEPTION 'Cannot approve %: no ground truth exists. Add ground truth first or use human_review status.', 
        NEW.institution;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for both INSERT and UPDATE
CREATE TRIGGER validate_policy_pack_before_approve
  BEFORE INSERT OR UPDATE ON institution_policy_packs
  FOR EACH ROW
  EXECUTE FUNCTION validate_policy_pack_approval();

-- 6. TIGHTEN CRITICAL FIELD DEFINITIONS RLS
DROP POLICY IF EXISTS "Anyone can read critical field definitions" ON critical_field_definitions;

CREATE POLICY "Authenticated users can read critical field definitions" 
ON critical_field_definitions FOR SELECT 
TO authenticated
USING (true);

-- 7. Add comment documenting the enforcement model
COMMENT ON FUNCTION validate_policy_pack_approval() IS 
'Production-grade enforcement for policy pack approval:
- INSERT: Only draft/human_review allowed (no direct approved inserts)
- Range validation: 0-60 residency, 0-120 transfer
- Approval requires:
  1. Non-NULL critical field values
  2. Non-empty field_provenance
  3. Provenance source = ground_truth or human_override for critical fields
  4. Exact match with ground_truth if it exists
  5. Ground truth MUST exist (strict mode) - comment out GATE 6 to relax
';