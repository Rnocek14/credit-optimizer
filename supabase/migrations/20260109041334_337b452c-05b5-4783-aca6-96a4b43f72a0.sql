-- =============================================================================
-- OPTION A: Standardize on 'active' only - remove dead 'approved' code paths
-- =============================================================================

-- 1. Drop and recreate trigger function with 'active' only
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
  -- INSERT GATE: Only allow non-active statuses on INSERT
  -- (prevents accidental direct inserts as active)
  -- =========================================================================
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    RAISE EXCEPTION 'Cannot insert directly as active. Insert as draft first, then update to active.';
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
  -- ACTIVATION GATES (only when setting status to 'active')
  -- =========================================================================
  IF NEW.status = 'active' THEN
    
    -- GATE 1: Critical field VALUES must exist (not just provenance)
    IF residency_val IS NULL THEN
      RAISE EXCEPTION 'Active packs must include residency credits value (got NULL)';
    END IF;

    IF max_transfer_val IS NULL THEN
      RAISE EXCEPTION 'Active packs must include max transfer credits value (got NULL)';
    END IF;

    -- GATE 2: Provenance must exist and not be empty
    IF NEW.field_provenance IS NULL OR NEW.field_provenance = '{}'::jsonb THEN
      RAISE EXCEPTION 'Active packs must include field_provenance tracking';
    END IF;

    -- GATE 3: Critical fields must have ground_truth or human_override source
    residency_source := NEW.field_provenance->'residency_policy.min_institutional_credits'->>'source';
    max_transfer_source := NEW.field_provenance->'transfer_credit_limits.max_total_transfer_credits'->>'source';

    IF residency_source IS NULL OR residency_source NOT IN ('ground_truth', 'human_override') THEN
      RAISE EXCEPTION 'Residency credits must be ground_truth or human_override for active packs (got: %)', COALESCE(residency_source, 'missing');
    END IF;

    IF max_transfer_source IS NULL OR max_transfer_source NOT IN ('ground_truth', 'human_override') THEN
      RAISE EXCEPTION 'Max transfer credits must be ground_truth or human_override for active packs (got: %)', COALESCE(max_transfer_source, 'missing');
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

    -- GATE 6: STRICT MODE - Ground truth MUST exist to activate
    IF NOT gt_exists THEN
      RAISE EXCEPTION 'Cannot activate %: no ground truth exists. Add ground truth first or keep as draft.', 
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

-- 2. Clean up partial unique index to only use 'active'
DROP INDEX IF EXISTS idx_institution_policy_packs_one_active;

CREATE UNIQUE INDEX idx_one_active_pack_per_institution
ON institution_policy_packs (institution)
WHERE status = 'active';

-- 3. Update function comment to reflect active-only model
COMMENT ON FUNCTION validate_policy_pack_approval() IS 
'Production-grade enforcement for policy pack activation.
Status model: draft → active → superseded/deprecated

Gates for activation (status = active):
1. INSERT blocked - must insert as draft first
2. Range validation: 0-60 residency, 0-120 transfer  
3. Non-NULL critical field values required
4. Non-empty field_provenance required
5. Provenance source = ground_truth or human_override for critical fields
6. Exact match with ground_truth if it exists
7. Ground truth MUST exist (strict mode)

Only one active pack per institution (unique index enforced).
';