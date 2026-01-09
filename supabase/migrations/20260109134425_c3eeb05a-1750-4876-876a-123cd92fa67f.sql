-- Restore strict activation enforcement with GT lookup + proper provenance sources
CREATE OR REPLACE FUNCTION validate_policy_pack_activation()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  res_val TEXT;
  max_val TEXT;
  res_src TEXT;
  max_src TEXT;
  gt_row RECORD;
  gt_residency INTEGER;
  gt_max_transfer INTEGER;
  pack_residency INTEGER;
  pack_max_transfer INTEGER;
BEGIN
  -- Only validate on activation (status changing to 'active')
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    
    -- GATE 1: Require provenance_url
    IF NEW.provenance_url IS NULL OR BTRIM(NEW.provenance_url) = '' THEN
      RAISE EXCEPTION 'Cannot activate: provenance_url is required';
    END IF;
    
    -- GATE 2: Require residency_credits in policy_data (integer validation)
    res_val := NEW.policy_data->>'residency_credits';
    IF res_val IS NULL OR BTRIM(res_val) = '' THEN
      RAISE EXCEPTION 'Cannot activate: policy_data.residency_credits is required';
    END IF;
    IF res_val !~ '^\d+$' THEN
      RAISE EXCEPTION 'Cannot activate: residency_credits must be integer (got: %)', res_val;
    END IF;
    pack_residency := res_val::INTEGER;
    
    -- GATE 3: Require max_transfer_credits in policy_data (integer validation)
    max_val := NEW.policy_data->>'max_transfer_credits';
    IF max_val IS NULL OR BTRIM(max_val) = '' THEN
      RAISE EXCEPTION 'Cannot activate: policy_data.max_transfer_credits is required';
    END IF;
    IF max_val !~ '^\d+$' THEN
      RAISE EXCEPTION 'Cannot activate: max_transfer_credits must be integer (got: %)', max_val;
    END IF;
    pack_max_transfer := max_val::INTEGER;
    
    -- GATE 4: Require field_provenance object
    IF NEW.field_provenance IS NULL THEN
      RAISE EXCEPTION 'Cannot activate: field_provenance is required';
    END IF;
    
    -- GATE 5: Require STRICT provenance for residency_credits (flat, prefixed, or legacy keys)
    IF (NEW.field_provenance ? 'residency_credits') THEN
      res_src := NEW.field_provenance->'residency_credits'->>'source';
    ELSIF (NEW.field_provenance ? 'policy_data.residency_credits') THEN
      res_src := NEW.field_provenance->'policy_data.residency_credits'->>'source';
    ELSIF (NEW.field_provenance ? 'residency_policy.min_institutional_credits') THEN
      res_src := NEW.field_provenance->'residency_policy.min_institutional_credits'->>'source';
    ELSE
      RAISE EXCEPTION 'Cannot activate: field_provenance missing residency key';
    END IF;
    
    -- STRICT: Only ground_truth or human_override allowed for critical fields
    IF res_src IS NULL OR res_src NOT IN ('ground_truth', 'human_override') THEN
      RAISE EXCEPTION 'Cannot activate: residency_credits provenance must be ground_truth or human_override (got: %)', COALESCE(res_src, 'NULL');
    END IF;
    
    -- GATE 6: Require STRICT provenance for max_transfer_credits
    IF (NEW.field_provenance ? 'max_transfer_credits') THEN
      max_src := NEW.field_provenance->'max_transfer_credits'->>'source';
    ELSIF (NEW.field_provenance ? 'policy_data.max_transfer_credits') THEN
      max_src := NEW.field_provenance->'policy_data.max_transfer_credits'->>'source';
    ELSIF (NEW.field_provenance ? 'transfer_credit_limits.max_total_transfer_credits') THEN
      max_src := NEW.field_provenance->'transfer_credit_limits.max_total_transfer_credits'->>'source';
    ELSE
      RAISE EXCEPTION 'Cannot activate: field_provenance missing max_transfer key';
    END IF;
    
    -- STRICT: Only ground_truth or human_override allowed for critical fields
    IF max_src IS NULL OR max_src NOT IN ('ground_truth', 'human_override') THEN
      RAISE EXCEPTION 'Cannot activate: max_transfer_credits provenance must be ground_truth or human_override (got: %)', COALESCE(max_src, 'NULL');
    END IF;
    
    -- GATE 7: Require minimum confidence score
    IF NEW.confidence_score IS NULL OR NEW.confidence_score < 80 THEN
      RAISE EXCEPTION 'Cannot activate: confidence_score must be >= 80 (got: %)', COALESCE(NEW.confidence_score::TEXT, 'NULL');
    END IF;
    
    -- GATE 8: Ground truth lookup and value matching
    SELECT * INTO gt_row
    FROM institution_policy_ground_truth
    WHERE institution_code = NEW.institution
      AND academic_year = NEW.academic_year
      AND is_current = true
    LIMIT 1;
    
    IF gt_row IS NOT NULL THEN
      -- GT exists: enforce value matching for critical fields
      gt_residency := gt_row.residency_credits;
      gt_max_transfer := gt_row.max_transfer_credits;
      
      -- Check residency match (if GT has it)
      IF gt_residency IS NOT NULL AND pack_residency IS DISTINCT FROM gt_residency THEN
        RAISE EXCEPTION 'Cannot activate: residency_credits (%) does not match ground_truth (%)', pack_residency, gt_residency;
      END IF;
      
      -- Check max_transfer match (if GT has it)
      IF gt_max_transfer IS NOT NULL AND pack_max_transfer IS DISTINCT FROM gt_max_transfer THEN
        RAISE EXCEPTION 'Cannot activate: max_transfer_credits (%) does not match ground_truth (%)', pack_max_transfer, gt_max_transfer;
      END IF;
    END IF;
    -- Note: If GT doesn't exist, we still allow activation if provenance is ground_truth/human_override
    -- This allows manual verification path
    
  END IF;
  
  RETURN NEW;
END;
$$;