-- =============================================================================
-- FIX: Case-insensitive matching in activate_policy_pack + add LIMIT 1 safety
-- =============================================================================

-- Recreate helper function with case-insensitive matching
CREATE OR REPLACE FUNCTION activate_policy_pack(new_pack_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  pack_institution TEXT;
  old_active_id UUID;
BEGIN
  -- Get institution from the pack we're activating (already uppercase due to constraint)
  SELECT institution INTO pack_institution
  FROM institution_policy_packs
  WHERE id = new_pack_id;

  IF pack_institution IS NULL THEN
    RAISE EXCEPTION 'Pack % not found', new_pack_id;
  END IF;

  -- Find current active using case-insensitive match for safety
  SELECT id INTO old_active_id
  FROM institution_policy_packs
  WHERE UPPER(institution) = UPPER(pack_institution) AND status = 'active'
  LIMIT 1;  -- Safety: handle any edge case duplicates

  -- Supersede old active
  IF old_active_id IS NOT NULL THEN
    UPDATE institution_policy_packs
    SET status = 'superseded', 
        superseded_by = new_pack_id,
        updated_at = now()
    WHERE id = old_active_id;
  END IF;

  -- Activate new pack (will run all gates via trigger)
  UPDATE institution_policy_packs
  SET status = 'active',
      updated_at = now()
  WHERE id = new_pack_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Also update the activation trigger to use LIMIT 1 for GT lookup (safety)
CREATE OR REPLACE FUNCTION validate_policy_pack_activation()
RETURNS TRIGGER AS $$
DECLARE
  residency_val INTEGER;
  max_transfer_val INTEGER;
  gt_residency INTEGER;
  gt_max_transfer INTEGER;
  residency_provenance JSONB;
  max_transfer_provenance JSONB;
  residency_source TEXT;
  max_transfer_source TEXT;
  gt_exists BOOLEAN;
  is_activating BOOLEAN;
BEGIN
  -- Extract critical values from policy_json
  residency_val := (NEW.policy_json->'residency_policy'->>'min_institutional_credits')::INTEGER;
  max_transfer_val := (NEW.policy_json->'transfer_credit_limits'->>'max_total_transfer_credits')::INTEGER;

  -- Determine if this is an activation (status changing TO active)
  is_activating := NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active');

  -- =========================================================================
  -- INSERT GATE: Block direct insert as active
  -- =========================================================================
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    RAISE EXCEPTION 'Cannot insert directly as active. Insert as draft first, then update to active.';
  END IF;

  -- =========================================================================
  -- RANGE VALIDATION (always applies)
  -- =========================================================================
  IF residency_val IS NOT NULL AND (residency_val < 0 OR residency_val > 60) THEN
    RAISE EXCEPTION 'Invalid residency credits: % (must be 0-60)', residency_val;
  END IF;
  
  IF max_transfer_val IS NOT NULL AND (max_transfer_val < 0 OR max_transfer_val > 120) THEN
    RAISE EXCEPTION 'Invalid max transfer credits: % (must be 0-120)', max_transfer_val;
  END IF;

  -- =========================================================================
  -- ACTIVATION GATES (only when status changes TO active)
  -- =========================================================================
  IF is_activating THEN
    
    -- GATE 1: Critical field VALUES must exist
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

    -- GATE 3: Validate provenance KEYS exist
    residency_provenance := NEW.field_provenance->'residency_policy.min_institutional_credits';
    max_transfer_provenance := NEW.field_provenance->'transfer_credit_limits.max_total_transfer_credits';

    IF residency_provenance IS NULL THEN
      RAISE EXCEPTION 'Provenance missing for residency_policy.min_institutional_credits';
    END IF;

    IF max_transfer_provenance IS NULL THEN
      RAISE EXCEPTION 'Provenance missing for transfer_credit_limits.max_total_transfer_credits';
    END IF;

    -- GATE 4: Provenance source must be ground_truth or human_override
    residency_source := residency_provenance->>'source';
    max_transfer_source := max_transfer_provenance->>'source';

    IF residency_source IS NULL OR residency_source NOT IN ('ground_truth', 'human_override') THEN
      RAISE EXCEPTION 'Residency credits must be ground_truth or human_override for active packs (got: %)', COALESCE(residency_source, 'missing');
    END IF;

    IF max_transfer_source IS NULL OR max_transfer_source NOT IN ('ground_truth', 'human_override') THEN
      RAISE EXCEPTION 'Max transfer credits must be ground_truth or human_override for active packs (got: %)', COALESCE(max_transfer_source, 'missing');
    END IF;

    -- GATE 5: Check ground truth existence (case-insensitive)
    SELECT EXISTS(
      SELECT 1 FROM institution_policy_ground_truth 
      WHERE UPPER(institution) = UPPER(NEW.institution)
      LIMIT 1
    ) INTO gt_exists;

    -- GATE 6: If ground truth exists, values MUST match exactly
    IF gt_exists THEN
      SELECT residency_credits, max_transfer_credits 
      INTO gt_residency, gt_max_transfer
      FROM institution_policy_ground_truth 
      WHERE UPPER(institution) = UPPER(NEW.institution)
      ORDER BY updated_at DESC NULLS LAST
      LIMIT 1;  -- Safety: handle any edge case duplicates

      IF gt_residency IS NOT NULL AND residency_val IS DISTINCT FROM gt_residency THEN
        RAISE EXCEPTION '% residency must be %, got % (ground truth mismatch)', 
          NEW.institution, gt_residency, residency_val;
      END IF;

      IF gt_max_transfer IS NOT NULL AND max_transfer_val IS DISTINCT FROM gt_max_transfer THEN
        RAISE EXCEPTION '% max transfer must be %, got % (ground truth mismatch)', 
          NEW.institution, gt_max_transfer, max_transfer_val;
      END IF;
    END IF;

    -- GATE 7: STRICT MODE - Ground truth MUST exist to activate
    IF NOT gt_exists THEN
      RAISE EXCEPTION 'Cannot activate %: no ground truth exists. Add ground truth first or keep as draft.', 
        NEW.institution;
    END IF;

  END IF;

  -- =========================================================================
  -- ACTIVE ROW PROTECTION: Prevent changing critical values on active rows
  -- =========================================================================
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status = 'active' THEN
    IF (OLD.policy_json->'residency_policy'->>'min_institutional_credits')::INTEGER 
       IS DISTINCT FROM residency_val THEN
      RAISE EXCEPTION 'Cannot modify residency credits on active pack. Supersede and create new.';
    END IF;

    IF (OLD.policy_json->'transfer_credit_limits'->>'max_total_transfer_credits')::INTEGER 
       IS DISTINCT FROM max_transfer_val THEN
      RAISE EXCEPTION 'Cannot modify max transfer credits on active pack. Supersede and create new.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;