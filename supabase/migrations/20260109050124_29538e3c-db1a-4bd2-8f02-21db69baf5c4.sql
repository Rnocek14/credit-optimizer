-- Option B: Keep existing degree_level enum, update trigger to map undergraduate -> bachelors logic
-- This avoids constraint violations while still fixing all trigger issues

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
BEGIN
  -- ═══════════════════════════════════════════════════════════════════════════
  -- GATE -1: Block direct INSERT as active (must insert as draft first)
  -- ═══════════════════════════════════════════════════════════════════════════
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    RAISE EXCEPTION 'Cannot insert policy pack directly as active. Insert as draft first, then activate via status update.';
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- IMMUTABILITY: Active rows cannot have critical fields modified
  -- ═══════════════════════════════════════════════════════════════════════════
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

  -- ═══════════════════════════════════════════════════════════════════════════
  -- Only run activation gates on transition TO active
  -- ═══════════════════════════════════════════════════════════════════════════
  is_activating := (NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active'));
  IF NOT is_activating THEN
    RETURN NEW;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- GATE 1: Require provenance_url
  -- ═══════════════════════════════════════════════════════════════════════════
  IF NEW.provenance_url IS NULL OR BTRIM(NEW.provenance_url) = '' THEN
    RAISE EXCEPTION 'Cannot activate policy pack: provenance_url is required';
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- GATE 2: Require policy_data with residency_credits
  -- ═══════════════════════════════════════════════════════════════════════════
  IF NEW.policy_data IS NULL OR NEW.policy_data->>'residency_credits' IS NULL THEN
    RAISE EXCEPTION 'Cannot activate policy pack: policy_data.residency_credits is required';
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- GATE 3: Match ground truth by (institution, academic_year)
  -- ═══════════════════════════════════════════════════════════════════════════
  SELECT * INTO gt_row
  FROM institution_policy_ground_truth
  WHERE institution = NEW.institution AND academic_year = NEW.academic_year;
  
  IF gt_row IS NULL THEN
    RAISE EXCEPTION 'Cannot activate: no ground truth for institution=% academic_year=%', NEW.institution, NEW.academic_year;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- GATE 4: Degree-level residency comparison
  -- Maps: 'associate' -> associate GT fields
  --       'undergraduate', 'graduate', or any other -> bachelors GT fields
  -- ═══════════════════════════════════════════════════════════════════════════
  IF NEW.degree_level = 'associate' THEN
    gt_residency := COALESCE(gt_row.residency_credits_associate, gt_row.residency_credits);
    gt_total_required := COALESCE(gt_row.total_credits_required_associate, 60);
  ELSIF NEW.degree_level IN ('undergraduate', 'graduate', 'bachelors') THEN
    gt_residency := COALESCE(gt_row.residency_credits_bachelors, gt_row.residency_credits);
    gt_total_required := COALESCE(gt_row.total_credits_required_bachelors, 120);
  ELSE
    RAISE EXCEPTION 'Cannot activate: unsupported degree_level=%. Allowed: associate, undergraduate, graduate', NEW.degree_level;
  END IF;
  
  pack_residency := (NEW.policy_data->>'residency_credits')::INTEGER;
  IF pack_residency IS DISTINCT FROM gt_residency THEN
    RAISE EXCEPTION 'Cannot activate: residency mismatch. Pack=%, GT=% for degree_level=%', pack_residency, gt_residency, NEW.degree_level;
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- GATE 5: Max transfer credits (computed or direct)
  -- ═══════════════════════════════════════════════════════════════════════════
  IF gt_row.max_transfer_rule IS NOT NULL AND gt_row.max_transfer_rule = 'total_credits_required - residency_credits' THEN
    computed_max_transfer := gt_total_required - gt_residency;
    IF computed_max_transfer < 0 THEN
      RAISE EXCEPTION 'Cannot activate: computed max_transfer is negative (total=%, residency=%)', gt_total_required, gt_residency;
    END IF;
    gt_max_transfer := computed_max_transfer;
  ELSE
    gt_max_transfer := gt_row.max_transfer_credits;
  END IF;
  
  IF NEW.policy_data->>'max_transfer_credits' IS NOT NULL THEN
    pack_max_transfer := (NEW.policy_data->>'max_transfer_credits')::INTEGER;
    IF pack_max_transfer IS DISTINCT FROM gt_max_transfer THEN
      RAISE EXCEPTION 'Cannot activate: max_transfer mismatch. Pack=%, GT=%', pack_max_transfer, gt_max_transfer;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;