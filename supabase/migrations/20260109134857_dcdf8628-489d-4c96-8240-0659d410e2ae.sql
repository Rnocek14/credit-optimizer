-- STRICT MODE trigger with correct GT schema, degree-level support, and rule computation
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
  gt_total_required INTEGER;
  pack_residency INTEGER;
  pack_max_transfer INTEGER;
BEGIN
  -- Only validate on activation (status changing to 'active')
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    
    -- GATE 1: Require provenance_url
    IF NEW.provenance_url IS NULL OR BTRIM(NEW.provenance_url) = '' THEN
      RAISE EXCEPTION 'Cannot activate: provenance_url is required';
    END IF;
    
    -- GATE 2: Require residency_credits in policy_data (normalize + integer validation)
    res_val := NULLIF(BTRIM(NEW.policy_data->>'residency_credits'), '');
    IF res_val IS NULL THEN
      RAISE EXCEPTION 'Cannot activate: policy_data.residency_credits is required';
    END IF;
    IF res_val !~ '^\d+$' THEN
      RAISE EXCEPTION 'Cannot activate: residency_credits must be integer (got: %)', res_val;
    END IF;
    pack_residency := res_val::INTEGER;
    
    -- GATE 3: Require max_transfer_credits in policy_data (normalize + integer validation)
    max_val := NULLIF(BTRIM(NEW.policy_data->>'max_transfer_credits'), '');
    IF max_val IS NULL THEN
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
    
    -- GATE 8: Ground truth lookup (STRICT MODE - GT must exist)
    SELECT * INTO gt_row
    FROM institution_policy_ground_truth
    WHERE UPPER(BTRIM(institution)) = UPPER(BTRIM(NEW.institution))
      AND BTRIM(academic_year) = BTRIM(NEW.academic_year);
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Cannot activate: no ground truth for institution=% academic_year=%',
        BTRIM(NEW.institution), BTRIM(NEW.academic_year);
    END IF;
    
    -- GATE 9: Degree-level residency matching
    IF NEW.degree_level = 'associate' THEN
      gt_residency := COALESCE(gt_row.residency_credits_associate, gt_row.residency_credits);
      gt_total_required := COALESCE(gt_row.total_credits_required_associate, 60);
    ELSE
      -- Default to bachelors/undergraduate
      gt_residency := COALESCE(gt_row.residency_credits_bachelors, gt_row.residency_credits);
      gt_total_required := COALESCE(gt_row.total_credits_required_bachelors, 120);
    END IF;
    
    IF gt_residency IS NULL THEN
      RAISE EXCEPTION 'Cannot activate: ground truth residency is NULL (institution=% academic_year=% degree_level=%)',
        BTRIM(NEW.institution), BTRIM(NEW.academic_year), NEW.degree_level;
    END IF;
    
    IF pack_residency IS DISTINCT FROM gt_residency THEN
      RAISE EXCEPTION 'Cannot activate: residency_credits mismatch. Pack=%, GT=%',
        pack_residency, gt_residency;
    END IF;
    
    -- GATE 10: Max transfer (rule-based or explicit)
    IF gt_row.max_transfer_rule IS NOT NULL
       AND gt_row.max_transfer_rule = 'total_credits_required - residency_credits' THEN
      gt_max_transfer := gt_total_required - gt_residency;
      IF gt_max_transfer < 0 THEN
        RAISE EXCEPTION 'Cannot activate: computed max_transfer is negative (total=% residency=%)',
          gt_total_required, gt_residency;
      END IF;
    ELSE
      gt_max_transfer := gt_row.max_transfer_credits;
    END IF;
    
    IF gt_max_transfer IS NULL THEN
      RAISE EXCEPTION 'Cannot activate: ground truth max_transfer is NULL and no rule defined (institution=% academic_year=%)',
        BTRIM(NEW.institution), BTRIM(NEW.academic_year);
    END IF;
    
    IF pack_max_transfer IS DISTINCT FROM gt_max_transfer THEN
      RAISE EXCEPTION 'Cannot activate: max_transfer_credits mismatch. Pack=%, GT=%',
        pack_max_transfer, gt_max_transfer;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$;