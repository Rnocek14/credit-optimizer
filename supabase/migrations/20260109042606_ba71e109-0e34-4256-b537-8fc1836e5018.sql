
-- Add integer validation guard to catch non-numeric strings
CREATE OR REPLACE FUNCTION validate_policy_pack_activation()
RETURNS TRIGGER AS $$
DECLARE
  residency_txt TEXT;
  max_transfer_txt TEXT;
  residency_val INTEGER;
  max_transfer_val INTEGER;
  old_residency_val INTEGER;
  old_max_transfer_val INTEGER;
  gt_residency INTEGER;
  gt_max_transfer INTEGER;
  residency_provenance JSONB;
  max_transfer_provenance JSONB;
  residency_source TEXT;
  max_transfer_source TEXT;
  gt_exists BOOLEAN;
  is_activating BOOLEAN;
BEGIN
  -- Extract text values first (for validation)
  residency_txt := NULLIF(NEW.policy_json->'residency_policy'->>'min_institutional_credits', '');
  max_transfer_txt := NULLIF(NEW.policy_json->'transfer_credit_limits'->>'max_total_transfer_credits', '');
  
  -- GATE 0: Integer validation - catch "N/A", "unknown", etc.
  IF residency_txt IS NOT NULL AND residency_txt !~ '^\d+$' THEN
    RAISE EXCEPTION 'Residency credits must be an integer string, got: %', residency_txt;
  END IF;
  
  IF max_transfer_txt IS NOT NULL AND max_transfer_txt !~ '^\d+$' THEN
    RAISE EXCEPTION 'Max transfer credits must be an integer string, got: %', max_transfer_txt;
  END IF;
  
  -- Safe to cast now
  residency_val := residency_txt::INTEGER;
  max_transfer_val := max_transfer_txt::INTEGER;

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

    -- GATE 5: Check ground truth existence
    SELECT EXISTS(
      SELECT 1 FROM institution_policy_ground_truth 
      WHERE UPPER(institution) = UPPER(NEW.institution)
    ) INTO gt_exists;

    -- GATE 6: If ground truth exists, values MUST match exactly
    IF gt_exists THEN
      SELECT residency_credits, max_transfer_credits 
      INTO gt_residency, gt_max_transfer
      FROM institution_policy_ground_truth 
      WHERE UPPER(institution) = UPPER(NEW.institution);

      IF gt_residency IS NOT NULL AND residency_val IS DISTINCT FROM gt_residency THEN
        RAISE EXCEPTION 'Residency credits (%) does not match ground truth (%) for %', 
          residency_val, gt_residency, NEW.institution;
      END IF;

      IF gt_max_transfer IS NOT NULL AND max_transfer_val IS DISTINCT FROM gt_max_transfer THEN
        RAISE EXCEPTION 'Max transfer credits (%) does not match ground truth (%) for %', 
          max_transfer_val, gt_max_transfer, NEW.institution;
      END IF;

    -- GATE 7: If no ground truth exists, activation is blocked (strict mode)
    ELSE
      RAISE EXCEPTION 'Cannot activate: no ground truth exists for institution %', NEW.institution;
    END IF;

  END IF;

  -- =========================================================================
  -- ACTIVE ROW PROTECTION (immutability for critical values)
  -- =========================================================================
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status = 'active' THEN
    -- Extract old values (NULL-safe)
    old_residency_val := NULLIF(OLD.policy_json->'residency_policy'->>'min_institutional_credits', '')::INTEGER;
    old_max_transfer_val := NULLIF(OLD.policy_json->'transfer_credit_limits'->>'max_total_transfer_credits', '')::INTEGER;

    IF residency_val IS DISTINCT FROM old_residency_val THEN
      RAISE EXCEPTION 'Cannot modify residency credits on active pack (old: %, new: %). Supersede and create new pack instead.', 
        old_residency_val, residency_val;
    END IF;

    IF max_transfer_val IS DISTINCT FROM old_max_transfer_val THEN
      RAISE EXCEPTION 'Cannot modify max transfer credits on active pack (old: %, new: %). Supersede and create new pack instead.', 
        old_max_transfer_val, max_transfer_val;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
