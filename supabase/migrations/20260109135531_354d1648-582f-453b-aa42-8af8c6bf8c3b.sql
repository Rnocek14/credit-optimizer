-- Polish fixes for validate_policy_pack_activation trigger
-- 1. Normalize res_val with BTRIM
-- 2. Add provenance_url gate as GATE 1
-- 3. Make degree_level handling explicit

CREATE OR REPLACE FUNCTION public.validate_policy_pack_activation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  res_val TEXT;
  max_val TEXT;
  pack_residency INTEGER;
  pack_max_transfer INTEGER;
  res_prov JSONB;
  max_prov JSONB;
  res_source TEXT;
  max_source TEXT;
  gt_row RECORD;
  gt_residency INTEGER;
  gt_max_transfer INTEGER;
  gt_total_required INTEGER;
BEGIN
  -- Only validate on transition TO 'active'
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status IS DISTINCT FROM 'active') THEN
    
    -- GATE 1: Require provenance_url
    IF NEW.provenance_url IS NULL OR BTRIM(NEW.provenance_url) = '' THEN
      RAISE EXCEPTION 'Cannot activate: provenance_url is required';
    END IF;
    
    -- GATE 2: Extract and validate residency_credits (with BTRIM normalization)
    res_val := NULLIF(BTRIM(NEW.policy_data->>'residency_credits'), '');
    IF res_val IS NULL THEN
      RAISE EXCEPTION 'Cannot activate: policy_data.residency_credits is required';
    END IF;
    IF res_val !~ '^\d+$' THEN
      RAISE EXCEPTION 'Cannot activate: residency_credits must be integer, got "%"', res_val;
    END IF;
    pack_residency := res_val::INTEGER;
    
    -- GATE 3: Extract and validate max_transfer_credits (with BTRIM normalization)
    max_val := NULLIF(BTRIM(NEW.policy_data->>'max_transfer_credits'), '');
    IF max_val IS NULL THEN
      RAISE EXCEPTION 'Cannot activate: policy_data.max_transfer_credits is required';
    END IF;
    IF max_val !~ '^\d+$' THEN
      RAISE EXCEPTION 'Cannot activate: max_transfer_credits must be integer, got "%"', max_val;
    END IF;
    pack_max_transfer := max_val::INTEGER;
    
    -- GATE 4: Validate residency provenance (flat key support)
    res_prov := COALESCE(
      NEW.field_provenance->'residency_credits',
      NEW.field_provenance->'policy_data'->'residency_credits',
      NEW.field_provenance->'residency_policy'->'min_institutional_credits'
    );
    IF res_prov IS NULL THEN
      RAISE EXCEPTION 'Cannot activate: field_provenance for residency_credits is required';
    END IF;
    res_source := res_prov->>'source';
    IF res_source IS NULL OR res_source NOT IN ('ground_truth', 'human_override') THEN
      RAISE EXCEPTION 'Cannot activate: residency_credits provenance must be ground_truth or human_override, got "%"', res_source;
    END IF;
    
    -- GATE 5: Validate max_transfer provenance (flat key support)
    max_prov := COALESCE(
      NEW.field_provenance->'max_transfer_credits',
      NEW.field_provenance->'policy_data'->'max_transfer_credits',
      NEW.field_provenance->'transfer_policy'->'max_transfer_credits'
    );
    IF max_prov IS NULL THEN
      RAISE EXCEPTION 'Cannot activate: field_provenance for max_transfer_credits is required';
    END IF;
    max_source := max_prov->>'source';
    IF max_source IS NULL OR max_source NOT IN ('ground_truth', 'human_override') THEN
      RAISE EXCEPTION 'Cannot activate: max_transfer_credits provenance must be ground_truth or human_override, got "%"', max_source;
    END IF;
    
    -- GATE 6: Ground truth lookup (STRICT MODE - GT must exist)
    SELECT *
    INTO gt_row
    FROM institution_policy_ground_truth
    WHERE UPPER(BTRIM(institution)) = UPPER(BTRIM(NEW.institution))
      AND BTRIM(academic_year) = BTRIM(NEW.academic_year);
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Cannot activate: no ground truth for institution=% academic_year=%',
        BTRIM(NEW.institution), BTRIM(NEW.academic_year);
    END IF;
    
    -- GATE 7: Degree-level selection (explicit handling)
    IF NEW.degree_level = 'associate' THEN
      gt_residency := COALESCE(gt_row.residency_credits_associate, gt_row.residency_credits);
      gt_total_required := COALESCE(gt_row.total_credits_required_associate, 60);
    ELSIF NEW.degree_level IN ('undergraduate', 'graduate') THEN
      -- Both undergraduate and graduate use bachelors GT fields for now
      gt_residency := COALESCE(gt_row.residency_credits_bachelors, gt_row.residency_credits);
      gt_total_required := COALESCE(gt_row.total_credits_required_bachelors, 120);
    ELSE
      RAISE EXCEPTION 'Cannot activate: unsupported degree_level=%', NEW.degree_level;
    END IF;
    
    IF gt_residency IS NULL THEN
      RAISE EXCEPTION 'Cannot activate: ground truth residency is NULL (institution=% academic_year=% degree_level=%)',
        BTRIM(NEW.institution), BTRIM(NEW.academic_year), NEW.degree_level;
    END IF;
    
    -- GATE 8: Residency match
    IF pack_residency IS DISTINCT FROM gt_residency THEN
      RAISE EXCEPTION 'Cannot activate: residency_credits mismatch. Pack=%, GT=%',
        pack_residency, gt_residency;
    END IF;
    
    -- GATE 9: Max transfer (rule-based or explicit)
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
    
    -- GATE 10: Max transfer match
    IF pack_max_transfer IS DISTINCT FROM gt_max_transfer THEN
      RAISE EXCEPTION 'Cannot activate: max_transfer_credits mismatch. Pack=%, GT=%',
        pack_max_transfer, gt_max_transfer;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$;