-- Final fixes: mandatory max_transfer, NOT FOUND pattern, BTRIM academic_year
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
BEGIN
  -- GATE -1: Block direct INSERT as active
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    RAISE EXCEPTION 'Cannot insert policy pack directly as active. Insert as draft first, then activate via status update.';
  END IF;

  -- IMMUTABILITY: Active rows cannot have critical fields modified
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
    IF COALESCE(OLD.policy_data->>'residency_credits', '') IS DISTINCT FROM COALESCE(NEW.policy_data->>'residency_credits', '') THEN
      RAISE EXCEPTION 'Cannot modify residency_credits on active policy pack';
    END IF;
    IF COALESCE(OLD.policy_data->>'max_transfer_credits', '') IS DISTINCT FROM COALESCE(NEW.policy_data->>'max_transfer_credits', '') THEN
      RAISE EXCEPTION 'Cannot modify max_transfer_credits on active policy pack';
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

  -- GATE 3: Validate residency_credits (required, integer, provenance)
  res_txt := NULLIF(BTRIM(NEW.policy_data->>'residency_credits'), '');
  IF res_txt IS NULL THEN
    RAISE EXCEPTION 'Cannot activate: policy_data.residency_credits is required';
  END IF;
  IF res_txt !~ '^\d+$' THEN
    RAISE EXCEPTION 'Cannot activate: residency_credits must be an integer string, got: %', res_txt;
  END IF;
  pack_residency := res_txt::INTEGER;

  -- GATE 4: Validate max_transfer_credits (required, integer, provenance)
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
  
  -- Check residency provenance (support both key formats)
  IF (NEW.field_provenance ? 'policy_data.residency_credits') THEN
    res_src := NEW.field_provenance->'policy_data.residency_credits'->>'source';
  ELSIF (NEW.field_provenance ? 'residency_policy.min_institutional_credits') THEN
    res_src := NEW.field_provenance->'residency_policy.min_institutional_credits'->>'source';
  ELSE
    RAISE EXCEPTION 'Cannot activate: field_provenance missing residency key (policy_data.residency_credits or residency_policy.min_institutional_credits)';
  END IF;
  
  IF res_src IS NULL OR res_src NOT IN ('ground_truth', 'human_override') THEN
    RAISE EXCEPTION 'Cannot activate: residency provenance source % not allowed (must be ground_truth or human_override)', COALESCE(res_src, 'missing');
  END IF;

  -- Check max_transfer provenance (support both key formats)
  IF (NEW.field_provenance ? 'policy_data.max_transfer_credits') THEN
    max_src := NEW.field_provenance->'policy_data.max_transfer_credits'->>'source';
  ELSIF (NEW.field_provenance ? 'transfer_credit_limits.max_total_transfer_credits') THEN
    max_src := NEW.field_provenance->'transfer_credit_limits.max_total_transfer_credits'->>'source';
  ELSE
    RAISE EXCEPTION 'Cannot activate: field_provenance missing max_transfer key (policy_data.max_transfer_credits or transfer_credit_limits.max_total_transfer_credits)';
  END IF;
  
  IF max_src IS NULL OR max_src NOT IN ('ground_truth', 'human_override') THEN
    RAISE EXCEPTION 'Cannot activate: max_transfer provenance source % not allowed (must be ground_truth or human_override)', COALESCE(max_src, 'missing');
  END IF;

  -- GATE 6: Match ground truth by (institution, academic_year) - case insensitive, whitespace tolerant
  SELECT * INTO gt_row
  FROM institution_policy_ground_truth
  WHERE UPPER(BTRIM(institution)) = UPPER(BTRIM(NEW.institution)) 
    AND BTRIM(academic_year) = BTRIM(NEW.academic_year);
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cannot activate: no ground truth for institution=% academic_year=%', BTRIM(NEW.institution), BTRIM(NEW.academic_year);
  END IF;

  -- GATE 7: Degree-level residency comparison
  IF NEW.degree_level = 'associate' THEN
    gt_residency := COALESCE(gt_row.residency_credits_associate, gt_row.residency_credits);
    gt_total_required := COALESCE(gt_row.total_credits_required_associate, 60);
  ELSIF NEW.degree_level IN ('undergraduate', 'graduate') THEN
    gt_residency := COALESCE(gt_row.residency_credits_bachelors, gt_row.residency_credits);
    gt_total_required := COALESCE(gt_row.total_credits_required_bachelors, 120);
  ELSE
    RAISE EXCEPTION 'Cannot activate: unsupported degree_level=%. Allowed: associate, undergraduate, graduate', NEW.degree_level;
  END IF;
  
  IF pack_residency IS DISTINCT FROM gt_residency THEN
    RAISE EXCEPTION 'Cannot activate: residency mismatch. Pack=%, GT=% for degree_level=%', pack_residency, gt_residency, NEW.degree_level;
  END IF;

  -- GATE 8: Max transfer credits comparison (computed or direct)
  IF gt_row.max_transfer_rule IS NOT NULL AND gt_row.max_transfer_rule = 'total_credits_required - residency_credits' THEN
    computed_max_transfer := gt_total_required - gt_residency;
    IF computed_max_transfer < 0 THEN
      RAISE EXCEPTION 'Cannot activate: computed max_transfer is negative (total=%, residency=%)', gt_total_required, gt_residency;
    END IF;
    gt_max_transfer := computed_max_transfer;
  ELSE
    gt_max_transfer := gt_row.max_transfer_credits;
  END IF;
  
  IF pack_max_transfer IS DISTINCT FROM gt_max_transfer THEN
    RAISE EXCEPTION 'Cannot activate: max_transfer mismatch. Pack=%, GT=%', pack_max_transfer, gt_max_transfer;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;