-- Fix validate_policy_pack_activation to use degree-level GT matching
-- Model B: GT is versioned by (institution, academic_year) and degree-aware

CREATE OR REPLACE FUNCTION validate_policy_pack_activation()
RETURNS TRIGGER AS $$
DECLARE
  pack_residency INTEGER;
  pack_max_transfer INTEGER;
  residency_txt TEXT;
  max_transfer_txt TEXT;
  old_residency_val INTEGER;
  old_max_transfer_val INTEGER;
  old_residency_txt TEXT;
  old_max_transfer_txt TEXT;
  gt_residency INTEGER;
  gt_max_transfer INTEGER;
  gt_total_required INTEGER;
  computed_max_transfer INTEGER;
  residency_provenance_source TEXT;
  max_transfer_provenance_source TEXT;
  gt_row institution_policy_ground_truth%ROWTYPE;
BEGIN
  -- ══════════════════════════════════════════════════════════════════
  -- IMMUTABILITY: Active rows cannot have critical fields modified
  -- ══════════════════════════════════════════════════════════════════
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' THEN
    -- Status change FROM active is allowed (superseding)
    IF NEW.status != 'active' THEN
      RETURN NEW;
    END IF;
    
    -- Parse OLD values with full validation
    old_residency_txt := NULLIF(BTRIM(OLD.policy_json->'residency_policy'->>'min_institutional_credits'), '');
    IF old_residency_txt IS NOT NULL AND old_residency_txt !~ '^\d+$' THEN
      RAISE EXCEPTION 'Active pack has invalid stored residency credits: %', old_residency_txt;
    END IF;
    old_residency_val := old_residency_txt::INTEGER;
    
    old_max_transfer_txt := NULLIF(BTRIM(OLD.policy_json->'transfer_credit_limits'->>'max_total_transfer_credits'), '');
    IF old_max_transfer_txt IS NOT NULL AND old_max_transfer_txt !~ '^\d+$' THEN
      RAISE EXCEPTION 'Active pack has invalid stored max transfer credits: %', old_max_transfer_txt;
    END IF;
    old_max_transfer_val := old_max_transfer_txt::INTEGER;
    
    -- Parse NEW values
    residency_txt := NULLIF(BTRIM(NEW.policy_json->'residency_policy'->>'min_institutional_credits'), '');
    IF residency_txt IS NOT NULL AND residency_txt !~ '^\d+$' THEN
      RAISE EXCEPTION 'Cannot update to invalid residency credits: %', residency_txt;
    END IF;
    pack_residency := residency_txt::INTEGER;
    
    max_transfer_txt := NULLIF(BTRIM(NEW.policy_json->'transfer_credit_limits'->>'max_total_transfer_credits'), '');
    IF max_transfer_txt IS NOT NULL AND max_transfer_txt !~ '^\d+$' THEN
      RAISE EXCEPTION 'Cannot update to invalid max transfer credits: %', max_transfer_txt;
    END IF;
    pack_max_transfer := max_transfer_txt::INTEGER;
    
    IF NEW.institution != OLD.institution
       OR NEW.academic_year != OLD.academic_year
       OR NEW.degree_level != OLD.degree_level
       OR pack_residency IS DISTINCT FROM old_residency_val
       OR pack_max_transfer IS DISTINCT FROM old_max_transfer_val THEN
      RAISE EXCEPTION 'Cannot modify critical fields on active policy pack. Create new draft instead.';
    END IF;
    
    RETURN NEW;
  END IF;

  -- ══════════════════════════════════════════════════════════════════
  -- Only validate on transition TO active status
  -- ══════════════════════════════════════════════════════════════════
  IF NEW.status != 'active' THEN
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' THEN
    RETURN NEW;
  END IF;

  -- ══════════════════════════════════════════════════════════════════
  -- Parse pack values with strict validation
  -- ══════════════════════════════════════════════════════════════════
  residency_txt := NULLIF(BTRIM(NEW.policy_json->'residency_policy'->>'min_institutional_credits'), '');
  IF residency_txt IS NULL THEN
    RAISE EXCEPTION 'Cannot activate: residency_policy.min_institutional_credits is required';
  END IF;
  IF residency_txt !~ '^\d+$' THEN
    RAISE EXCEPTION 'Cannot activate: residency_policy.min_institutional_credits "%" is not a valid integer', residency_txt;
  END IF;
  pack_residency := residency_txt::INTEGER;

  max_transfer_txt := NULLIF(BTRIM(NEW.policy_json->'transfer_credit_limits'->>'max_total_transfer_credits'), '');
  IF max_transfer_txt IS NULL THEN
    RAISE EXCEPTION 'Cannot activate: transfer_credit_limits.max_total_transfer_credits is required';
  END IF;
  IF max_transfer_txt !~ '^\d+$' THEN
    RAISE EXCEPTION 'Cannot activate: transfer_credit_limits.max_total_transfer_credits "%" is not a valid integer', max_transfer_txt;
  END IF;
  pack_max_transfer := max_transfer_txt::INTEGER;

  -- ══════════════════════════════════════════════════════════════════
  -- GATE 1: Provenance must exist for critical fields
  -- ══════════════════════════════════════════════════════════════════
  IF NEW.field_provenance IS NULL THEN
    RAISE EXCEPTION 'Cannot activate: field_provenance is required';
  END IF;
  
  IF NOT (NEW.field_provenance ? 'residency_policy.min_institutional_credits') THEN
    RAISE EXCEPTION 'Cannot activate: field_provenance key "residency_policy.min_institutional_credits" is required';
  END IF;
  
  IF NOT (NEW.field_provenance ? 'transfer_credit_limits.max_total_transfer_credits') THEN
    RAISE EXCEPTION 'Cannot activate: field_provenance key "transfer_credit_limits.max_total_transfer_credits" is required';
  END IF;

  -- ══════════════════════════════════════════════════════════════════
  -- GATE 2: Provenance sources must be ground_truth or human_override
  -- ══════════════════════════════════════════════════════════════════
  residency_provenance_source := NEW.field_provenance->'residency_policy.min_institutional_credits'->>'source';
  IF residency_provenance_source IS NULL OR residency_provenance_source NOT IN ('ground_truth', 'human_override') THEN
    RAISE EXCEPTION 'Cannot activate: residency provenance source "%" not allowed. Must be ground_truth or human_override.', residency_provenance_source;
  END IF;
  
  max_transfer_provenance_source := NEW.field_provenance->'transfer_credit_limits.max_total_transfer_credits'->>'source';
  IF max_transfer_provenance_source IS NULL OR max_transfer_provenance_source NOT IN ('ground_truth', 'human_override') THEN
    RAISE EXCEPTION 'Cannot activate: max_transfer provenance source "%" not allowed. Must be ground_truth or human_override.', max_transfer_provenance_source;
  END IF;

  -- ══════════════════════════════════════════════════════════════════
  -- GATE 3: Ground Truth must exist and match by (institution, academic_year)
  -- ══════════════════════════════════════════════════════════════════
  SELECT *
  INTO gt_row
  FROM institution_policy_ground_truth
  WHERE UPPER(institution) = UPPER(NEW.institution)
    AND academic_year = NEW.academic_year;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cannot activate: no ground truth found for institution=% academic_year=%', NEW.institution, NEW.academic_year;
  END IF;

  -- ══════════════════════════════════════════════════════════════════
  -- GATE 4: Degree-level residency comparison
  -- Use degree_level from pack to select appropriate GT column
  -- ══════════════════════════════════════════════════════════════════
  IF NEW.degree_level = 'associate' THEN
    gt_residency := COALESCE(gt_row.residency_credits_associate, gt_row.residency_credits);
    gt_total_required := COALESCE(gt_row.total_credits_required_associate, 60);
  ELSE
    -- Default to bachelor's for undergraduate, graduate, or any other level
    gt_residency := COALESCE(gt_row.residency_credits_bachelors, gt_row.residency_credits);
    gt_total_required := COALESCE(gt_row.total_credits_required_bachelors, 120);
  END IF;
  
  IF gt_residency IS NULL THEN
    RAISE EXCEPTION 'Cannot activate: ground truth residency is NULL for institution=% academic_year=% degree_level=%', 
      NEW.institution, NEW.academic_year, NEW.degree_level;
  END IF;
  
  IF pack_residency != gt_residency THEN
    RAISE EXCEPTION 'Cannot activate: residency mismatch. Pack has %, ground truth has % (institution=%, academic_year=%, degree_level=%)',
      pack_residency, gt_residency, NEW.institution, NEW.academic_year, NEW.degree_level;
  END IF;

  -- ══════════════════════════════════════════════════════════════════
  -- GATE 5: Max transfer comparison (supports computed via rule)
  -- ══════════════════════════════════════════════════════════════════
  IF gt_row.max_transfer_rule IS NOT NULL AND gt_row.max_transfer_rule = 'total_credits_required - residency_credits' THEN
    -- Compute max transfer from rule
    computed_max_transfer := gt_total_required - gt_residency;
    gt_max_transfer := computed_max_transfer;
  ELSE
    -- Use explicit max_transfer_credits
    gt_max_transfer := gt_row.max_transfer_credits;
  END IF;
  
  IF gt_max_transfer IS NULL THEN
    RAISE EXCEPTION 'Cannot activate: ground truth max_transfer is NULL and no rule defined for institution=% academic_year=%', 
      NEW.institution, NEW.academic_year;
  END IF;
  
  IF pack_max_transfer != gt_max_transfer THEN
    RAISE EXCEPTION 'Cannot activate: max_transfer mismatch. Pack has %, ground truth has % (computed=%) (institution=%, academic_year=%, degree_level=%)',
      pack_max_transfer, gt_max_transfer, 
      CASE WHEN gt_row.max_transfer_rule IS NOT NULL THEN 'yes' ELSE 'no' END,
      NEW.institution, NEW.academic_year, NEW.degree_level;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;