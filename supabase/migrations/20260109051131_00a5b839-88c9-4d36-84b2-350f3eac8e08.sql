-- Final polish: integer-safe immutability + explicit GT NULL guards
CREATE OR REPLACE FUNCTION validate_policy_pack_activation()
RETURNS TRIGGER AS $$
DECLARE
  is_activating BOOLEAN;
  gt_row RECORD;
  gt_residency INTEGER;
  gt_total_required INTEGER;
  gt_max_transfer INTEGER;
  computed_max_transfer INTEGER;
  pack_residency INTEGER;
  pack_max_transfer INTEGER;
  res_txt TEXT;
  max_txt TEXT;
  res_src TEXT;
  max_src TEXT;
  -- Immutability vars
  old_res_txt TEXT;
  new_res_txt TEXT;
  old_max_txt TEXT;
  new_max_txt TEXT;
  old_res_int INTEGER;
  new_res_int INTEGER;
  old_max_int INTEGER;
  new_max_int INTEGER;
BEGIN
  -- GATE -1: Block direct INSERT as active
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    RAISE EXCEPTION 'Cannot insert policy pack directly as active. Insert as draft first, then activate via status update.';
  END IF;

  -- IMMUTABILITY: Active rows cannot have critical fields modified (integer-safe)
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status = 'active' THEN
    IF BTRIM(OLD.institution) IS DISTINCT FROM BTRIM(NEW.institution) THEN
      RAISE EXCEPTION 'Cannot modify institution on active policy pack';
    END IF;
    IF BTRIM(OLD.academic_year) IS DISTINCT FROM BTRIM(NEW.academic_year) THEN
      RAISE EXCEPTION 'Cannot modify academic_year on active policy pack';
    END IF;
    IF BTRIM(OLD.degree_level) IS DISTINCT FROM BTRIM(NEW.degree_level) THEN
      RAISE EXCEPTION 'Cannot modify degree_level on active policy pack';
    END IF;
    
    -- Integer-safe residency comparison
    old_res_txt := NULLIF(BTRIM(OLD.policy_data->>'residency_credits'), '');
    new_res_txt := NULLIF(BTRIM(NEW.policy_data->>'residency_credits'), '');
    
    IF old_res_txt IS NOT NULL AND old_res_txt !~ '^\d+$' THEN
      RAISE EXCEPTION 'Active policy pack has corrupted residency_credits: %', old_res_txt;
    END IF;
    IF new_res_txt IS NOT NULL AND new_res_txt !~ '^\d+$' THEN
      RAISE EXCEPTION 'Cannot set non-integer residency_credits on active policy pack: %', new_res_txt;
    END IF;
    
    old_res_int := CASE WHEN old_res_txt IS NOT NULL THEN old_res_txt::INTEGER ELSE NULL END;
    new_res_int := CASE WHEN new_res_txt IS NOT NULL THEN new_res_txt::INTEGER ELSE NULL END;
    
    IF old_res_int IS DISTINCT FROM new_res_int THEN
      RAISE EXCEPTION 'Cannot modify residency_credits on active policy pack (was: %, attempted: %)', old_res_int, new_res_int;
    END IF;
    
    -- Integer-safe max_transfer comparison
    old_max_txt := NULLIF(BTRIM(OLD.policy_data->>'max_transfer_credits'), '');
    new_max_txt := NULLIF(BTRIM(NEW.policy_data->>'max_transfer_credits'), '');
    
    IF old_max_txt IS NOT NULL AND old_max_txt !~ '^\d+$' THEN
      RAISE EXCEPTION 'Active policy pack has corrupted max_transfer_credits: %', old_max_txt;
    END IF;
    IF new_max_txt IS NOT NULL AND new_max_txt !~ '^\d+$' THEN
      RAISE EXCEPTION 'Cannot set non-integer max_transfer_credits on active policy pack: %', new_max_txt;
    END IF;
    
    old_max_int := CASE WHEN old_max_txt IS NOT NULL THEN old_max_txt::INTEGER ELSE NULL END;
    new_max_int := CASE WHEN new_max_txt IS NOT NULL THEN new_max_txt::INTEGER ELSE NULL END;
    
    IF old_max_int IS DISTINCT FROM new_max_int THEN
      RAISE EXCEPTION 'Cannot modify max_transfer_credits on active policy pack (was: %, attempted: %)', old_max_int, new_max_int;
    END IF;
    
    RETURN NEW;
  END IF;

  -- Only run activation gates on transition TO active
  is_activating := (NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active'));
  IF NOT is_activating THEN
    RETURN NEW;
  END IF;

  -- GATE 1: Require provenance_url
  IF NEW.provenance_url IS NULL OR BTRIM(NEW.provenance_url) = '' THEN
    RAISE EXCEPTION 'Cannot activate: provenance_url is required';
  END IF;

  -- GATE 2: Require policy_data
  IF NEW.policy_data IS NULL THEN
    RAISE EXCEPTION 'Cannot activate: policy_data is required';
  END IF;

  -- GATE 3: Validate residency_credits (required, integer)
  res_txt := NULLIF(BTRIM(NEW.policy_data->>'residency_credits'), '');
  IF res_txt IS NULL THEN
    RAISE EXCEPTION 'Cannot activate: policy_data.residency_credits is required';
  END IF;
  IF res_txt !~ '^\d+$' THEN
    RAISE EXCEPTION 'Cannot activate: residency_credits must be an integer string, got: %', res_txt;
  END IF;
  pack_residency := res_txt::INTEGER;

  -- GATE 4: Validate max_transfer_credits (required, integer)
  max_txt := NULLIF(BTRIM(NEW.policy_data->>'max_transfer_credits'), '');
  IF max_txt IS NULL THEN
    RAISE EXCEPTION 'Cannot activate: policy_data.max_transfer_credits is required';
  END IF;
  IF max_txt !~ '^\d+$' THEN
    RAISE EXCEPTION 'Cannot activate: max_transfer_credits must be an integer string, got: %', max_txt;
  END IF;
  pack_max_transfer := max_txt::INTEGER;

  -- GATE 5: Require field_provenance with valid sources
  IF NEW.field_provenance IS NULL THEN
    RAISE EXCEPTION 'Cannot activate: field_provenance is required';
  END IF;
  
  IF (NEW.field_provenance ? 'policy_data.residency_credits') THEN
    res_src := NEW.field_provenance->'policy_data.residency_credits'->>'source';
  ELSIF (NEW.field_provenance ? 'residency_policy.min_institutional_credits') THEN
    res_src := NEW.field_provenance->'residency_policy.min_institutional_credits'->>'source';
  ELSE
    RAISE EXCEPTION 'Cannot activate: field_provenance missing residency key';
  END IF;
  
  IF res_src IS NULL OR res_src NOT IN ('ground_truth', 'human_override') THEN
    RAISE EXCEPTION 'Cannot activate: residency provenance source % not allowed', COALESCE(res_src, 'missing');
  END IF;

  IF (NEW.field_provenance ? 'policy_data.max_transfer_credits') THEN
    max_src := NEW.field_provenance->'policy_data.max_transfer_credits'->>'source';
  ELSIF (NEW.field_provenance ? 'transfer_credit_limits.max_total_transfer_credits') THEN
    max_src := NEW.field_provenance->'transfer_credit_limits.max_total_transfer_credits'->>'source';
  ELSE
    RAISE EXCEPTION 'Cannot activate: field_provenance missing max_transfer key';
  END IF;
  
  IF max_src IS NULL OR max_src NOT IN ('ground_truth', 'human_override') THEN
    RAISE EXCEPTION 'Cannot activate: max_transfer provenance source % not allowed', COALESCE(max_src, 'missing');
  END IF;

  -- GATE 6: Match ground truth
  SELECT * INTO gt_row
  FROM institution_policy_ground_truth
  WHERE UPPER(BTRIM(institution)) = UPPER(BTRIM(NEW.institution)) 
    AND BTRIM(academic_year) = BTRIM(NEW.academic_year);
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cannot activate: no ground truth for institution=% academic_year=%', BTRIM(NEW.institution), BTRIM(NEW.academic_year);
  END IF;

  -- GATE 7: Degree-level residency with explicit NULL guard
  IF NEW.degree_level = 'associate' THEN
    gt_residency := COALESCE(gt_row.residency_credits_associate, gt_row.residency_credits);
    gt_total_required := COALESCE(gt_row.total_credits_required_associate, 60);
  ELSIF NEW.degree_level IN ('undergraduate', 'graduate') THEN
    gt_residency := COALESCE(gt_row.residency_credits_bachelors, gt_row.residency_credits);
    gt_total_required := COALESCE(gt_row.total_credits_required_bachelors, 120);
  ELSE
    RAISE EXCEPTION 'Cannot activate: unsupported degree_level=%', NEW.degree_level;
  END IF;
  
  IF gt_residency IS NULL THEN
    RAISE EXCEPTION 'Cannot activate: ground truth residency is NULL for institution=% academic_year=% degree_level=%', 
      BTRIM(NEW.institution), BTRIM(NEW.academic_year), NEW.degree_level;
  END IF;
  
  IF pack_residency IS DISTINCT FROM gt_residency THEN
    RAISE EXCEPTION 'Cannot activate: residency mismatch. Pack=%, GT=% for degree_level=%', pack_residency, gt_residency, NEW.degree_level;
  END IF;

  -- GATE 8: Max transfer with computed rule + NULL guard
  IF gt_row.max_transfer_rule IS NOT NULL AND gt_row.max_transfer_rule = 'total_credits_required - residency_credits' THEN
    computed_max_transfer := gt_total_required - gt_residency;
    IF computed_max_transfer < 0 THEN
      RAISE EXCEPTION 'Cannot activate: computed max_transfer is negative (total=%, residency=%)', gt_total_required, gt_residency;
    END IF;
    gt_max_transfer := computed_max_transfer;
  ELSE
    gt_max_transfer := gt_row.max_transfer_credits;
  END IF;
  
  IF gt_max_transfer IS NULL THEN
    RAISE EXCEPTION 'Cannot activate: ground truth max_transfer is NULL and no rule defined for institution=% academic_year=%',
      BTRIM(NEW.institution), BTRIM(NEW.academic_year);
  END IF;
  
  IF pack_max_transfer IS DISTINCT FROM gt_max_transfer THEN
    RAISE EXCEPTION 'Cannot activate: max_transfer mismatch. Pack=%, GT=%', pack_max_transfer, gt_max_transfer;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;