-- =============================================================================
-- BULLETPROOF ENFORCEMENT: Hard fails, provenance gates, case normalization
-- =============================================================================

-- 1. Drop old trigger and recreate with EXCEPTION instead of WARNING
DROP TRIGGER IF EXISTS validate_policy_pack_before_approve ON institution_policy_packs;
DROP FUNCTION IF EXISTS validate_policy_pack_approval();

-- 2. Create bulletproof validation function with all safeguards
CREATE OR REPLACE FUNCTION validate_policy_pack_approval()
RETURNS TRIGGER AS $$
DECLARE
  residency_val INTEGER;
  max_transfer_val INTEGER;
  gt_residency INTEGER;
  gt_max_transfer INTEGER;
  residency_source TEXT;
  max_transfer_source TEXT;
BEGIN
  -- Extract critical values from policy_json
  residency_val := (NEW.policy_json->'residency_policy'->>'min_institutional_credits')::INTEGER;
  max_transfer_val := (NEW.policy_json->'transfer_credit_limits'->>'max_total_transfer_credits')::INTEGER;

  -- =========================================================================
  -- RANGE VALIDATION (applies to ALL status changes)
  -- =========================================================================
  
  -- Validate residency is in sane range (0-60)
  IF residency_val IS NOT NULL AND (residency_val < 0 OR residency_val > 60) THEN
    RAISE EXCEPTION 'Invalid residency credits: % (must be 0-60)', residency_val;
  END IF;
  
  -- Validate max transfer is in sane range (0-120)
  IF max_transfer_val IS NOT NULL AND (max_transfer_val < 0 OR max_transfer_val > 120) THEN
    RAISE EXCEPTION 'Invalid max transfer credits: % (must be 0-120)', max_transfer_val;
  END IF;

  -- =========================================================================
  -- APPROVAL GATES (only for approved/active status)
  -- =========================================================================
  IF NEW.status IN ('active', 'approved') THEN
    
    -- GATE 1: Provenance must exist
    IF NEW.field_provenance IS NULL OR NEW.field_provenance = '{}'::jsonb THEN
      RAISE EXCEPTION 'Approved packs must include field_provenance tracking';
    END IF;

    -- GATE 2: Critical fields must have ground_truth or human_override source
    residency_source := NEW.field_provenance->'residency_policy.min_institutional_credits'->>'source';
    max_transfer_source := NEW.field_provenance->'transfer_credit_limits.max_total_transfer_credits'->>'source';

    IF residency_source IS NULL OR residency_source NOT IN ('ground_truth', 'human_override') THEN
      RAISE EXCEPTION 'Residency credits must be ground_truth or human_override for approved packs (got: %)', COALESCE(residency_source, 'missing');
    END IF;

    IF max_transfer_source IS NULL OR max_transfer_source NOT IN ('ground_truth', 'human_override') THEN
      RAISE EXCEPTION 'Max transfer credits must be ground_truth or human_override for approved packs (got: %)', COALESCE(max_transfer_source, 'missing');
    END IF;

    -- GATE 3: Per-institution exact match enforcement (HARD FAIL)
    -- Check ground truth and enforce exact match for known institutions
    SELECT residency_credits, max_transfer_credits 
    INTO gt_residency, gt_max_transfer
    FROM institution_policy_ground_truth 
    WHERE LOWER(institution) = LOWER(NEW.institution)
    LIMIT 1;

    IF gt_residency IS NOT NULL THEN
      IF residency_val IS DISTINCT FROM gt_residency THEN
        RAISE EXCEPTION '% residency must be %, got %', NEW.institution, gt_residency, residency_val;
      END IF;
    END IF;

    IF gt_max_transfer IS NOT NULL THEN
      IF max_transfer_val IS DISTINCT FROM gt_max_transfer THEN
        RAISE EXCEPTION '% max transfer must be %, got %', NEW.institution, gt_max_transfer, max_transfer_val;
      END IF;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger for both INSERT and UPDATE
CREATE TRIGGER validate_policy_pack_before_approve
  BEFORE INSERT OR UPDATE ON institution_policy_packs
  FOR EACH ROW
  EXECUTE FUNCTION validate_policy_pack_approval();

-- =========================================================================
-- 3. TIGHTEN RLS ON AUDIT TABLES (service role only for writes)
-- =========================================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Allow read access to policy_merge_audit_log" ON policy_merge_audit_log;
DROP POLICY IF EXISTS "Allow insert to policy_merge_audit_log from service role" ON policy_merge_audit_log;

-- Only authenticated users can read audit logs
CREATE POLICY "Authenticated users can read audit logs" 
ON policy_merge_audit_log FOR SELECT 
TO authenticated
USING (true);

-- Only service role can insert (edge functions use service role)
CREATE POLICY "Service role can insert audit logs" 
ON policy_merge_audit_log FOR INSERT 
TO service_role
WITH CHECK (true);

-- =========================================================================
-- 4. INSTITUTION KEY NORMALIZATION
-- =========================================================================

-- Add constraint to ensure consistent casing (uppercase)
-- First update any existing lowercase values
UPDATE institution_policy_packs SET institution = UPPER(institution) WHERE institution != UPPER(institution);
UPDATE institution_policy_ground_truth SET institution = UPPER(institution) WHERE institution != UPPER(institution);

-- Add constraints (will fail if there are still mismatched values)
DO $$
BEGIN
  -- Only add if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'institution_policy_packs_institution_uppercase'
  ) THEN
    ALTER TABLE institution_policy_packs
    ADD CONSTRAINT institution_policy_packs_institution_uppercase 
    CHECK (institution = UPPER(institution));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'institution_ground_truth_institution_uppercase'
  ) THEN
    ALTER TABLE institution_policy_ground_truth
    ADD CONSTRAINT institution_ground_truth_institution_uppercase 
    CHECK (institution = UPPER(institution));
  END IF;
END $$;

-- =========================================================================
-- 5. TIGHTEN RLS ON CRITICAL FIELD DEFINITIONS (admin only)
-- =========================================================================

ALTER TABLE critical_field_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read critical field definitions" 
ON critical_field_definitions FOR SELECT 
USING (true);

-- No insert/update/delete for regular users
CREATE POLICY "Service role can manage critical field definitions" 
ON critical_field_definitions FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);