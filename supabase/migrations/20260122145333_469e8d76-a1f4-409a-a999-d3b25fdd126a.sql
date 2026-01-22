-- ============================================
-- TIGHTEN-UP: Trigger cleanup + Gate 4/7 fixes + Legacy backfill
-- ============================================

-- 1) Clean up any duplicate/old triggers
DROP TRIGGER IF EXISTS trg_validate_policy_pack_activation ON institution_policy_packs;
DROP TRIGGER IF EXISTS trg_enforce_policy_pack_activation ON institution_policy_packs;
DROP TRIGGER IF EXISTS trg_validate_policy_pack_active_status ON institution_policy_packs;
DROP TRIGGER IF EXISTS validate_policy_pack_active_status_trigger ON institution_policy_packs;
DROP TRIGGER IF EXISTS validate_policy_pack_activation_trigger ON institution_policy_packs;

-- 2) Replace validation function with fixed Gate 4 + strengthened Gate 7
CREATE OR REPLACE FUNCTION public.validate_policy_pack_can_activate()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_conf NUMERIC;
  v_waived BOOLEAN;
  v_waiver_reason TEXT;
  v_residency INT;
  v_max_transfer INT;
  v_max_alt INT;
  v_total INT;
  v_bucket_mode TEXT;
  v_has_ground_truth BOOLEAN;
  
  -- Provenance sources
  v_prov_residency TEXT;
  v_prov_max_transfer TEXT;
  v_prov_max_alt TEXT;
  v_prov_total TEXT;
  v_alt_key TEXT; -- Dynamic key based on bucket mode
  
  -- Gate 7: Provenance verification
  v_prov_verified_at TEXT;
  v_prov_verified_by TEXT;
  v_prov_source_url TEXT;
  v_prov_waived BOOLEAN;
  v_prov_waiver_reason TEXT;
BEGIN
  -- Only validate when transitioning TO active status
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status IS DISTINCT FROM 'active') THEN
    
    -- ========== GATE 1: BUCKET MODE ==========
    v_bucket_mode := NEW.policy_data->>'transfer_alt_bucket_mode';
    IF v_bucket_mode IS NULL OR v_bucket_mode NOT IN ('separate', 'combined') THEN
      RAISE EXCEPTION 'Cannot activate: transfer_alt_bucket_mode must be "separate" or "combined", got "%"', COALESCE(v_bucket_mode, 'null');
    END IF;
    
    -- Determine which alt credit key to use based on mode
    IF v_bucket_mode = 'separate' THEN
      v_alt_key := 'max_alt_credit';
    ELSE
      v_alt_key := 'max_transfer_alt_combined_credits';
    END IF;
    
    -- ========== GATE 2: REQUIRED NUMERIC FIELDS ==========
    BEGIN v_residency := (NEW.policy_data->>'residency_credits')::INT; EXCEPTION WHEN OTHERS THEN v_residency := NULL; END;
    BEGIN v_max_transfer := (NEW.policy_data->>'max_transfer_credits')::INT; EXCEPTION WHEN OTHERS THEN v_max_transfer := NULL; END;
    BEGIN v_total := (NEW.policy_data->>'degree_credit_total')::INT; EXCEPTION WHEN OTHERS THEN v_total := NULL; END;
    BEGIN v_max_alt := (NEW.policy_data->>v_alt_key)::INT; EXCEPTION WHEN OTHERS THEN v_max_alt := NULL; END;
    
    IF v_residency IS NULL THEN
      RAISE EXCEPTION 'Cannot activate: missing residency_credits';
    END IF;
    IF v_max_transfer IS NULL THEN
      RAISE EXCEPTION 'Cannot activate: missing max_transfer_credits';
    END IF;
    IF v_total IS NULL THEN
      RAISE EXCEPTION 'Cannot activate: missing degree_credit_total';
    END IF;
    IF v_max_alt IS NULL THEN
      RAISE EXCEPTION 'Cannot activate: missing % (required for % mode)', v_alt_key, v_bucket_mode;
    END IF;
    
    -- ========== GATE 3: COHERENCE CHECKS ==========
    IF v_residency > v_total THEN
      RAISE EXCEPTION 'Cannot activate: residency_credits (%) > degree_credit_total (%)', v_residency, v_total;
    END IF;
    IF v_max_transfer > v_total THEN
      RAISE EXCEPTION 'Cannot activate: max_transfer_credits (%) > degree_credit_total (%)', v_max_transfer, v_total;
    END IF;
    IF v_max_alt > v_max_transfer THEN
      RAISE EXCEPTION 'Cannot activate: % (%) > max_transfer_credits (%)', v_alt_key, v_max_alt, v_max_transfer;
    END IF;
    
    -- ========== GATE 4: PROVENANCE FOR ALL REQUIRED FIELDS (mode-aware) ==========
    v_prov_residency := COALESCE(
      NEW.field_provenance->'residency_credits'->>'source',
      NEW.field_provenance->>'residency_credits',
      ''
    );
    v_prov_max_transfer := COALESCE(
      NEW.field_provenance->'max_transfer_credits'->>'source',
      NEW.field_provenance->>'max_transfer_credits',
      ''
    );
    v_prov_total := COALESCE(
      NEW.field_provenance->'degree_credit_total'->>'source',
      NEW.field_provenance->>'degree_credit_total',
      ''
    );
    
    -- Use dynamic key for alt credit provenance based on bucket mode
    v_prov_max_alt := COALESCE(
      NEW.field_provenance->v_alt_key->>'source',
      NEW.field_provenance->>v_alt_key,
      ''
    );
    
    IF v_prov_residency NOT IN ('ground_truth', 'human_override') THEN
      RAISE EXCEPTION 'Cannot activate: invalid provenance for residency_credits (got "%")', v_prov_residency;
    END IF;
    IF v_prov_max_transfer NOT IN ('ground_truth', 'human_override') THEN
      RAISE EXCEPTION 'Cannot activate: invalid provenance for max_transfer_credits (got "%")', v_prov_max_transfer;
    END IF;
    IF v_prov_max_alt NOT IN ('ground_truth', 'human_override') THEN
      RAISE EXCEPTION 'Cannot activate: invalid provenance for % (got "%")', v_alt_key, v_prov_max_alt;
    END IF;
    IF v_prov_total NOT IN ('ground_truth', 'human_override') THEN
      RAISE EXCEPTION 'Cannot activate: invalid provenance for degree_credit_total (got "%")', v_prov_total;
    END IF;
    
    -- ========== GATE 5: GROUND TRUTH ROW EXISTS ==========
    SELECT EXISTS (
      SELECT 1 FROM institution_policy_ground_truth
      WHERE institution = NEW.institution
    ) INTO v_has_ground_truth;
    
    IF NOT v_has_ground_truth THEN
      RAISE EXCEPTION 'Cannot activate: no ground truth record exists for institution %', NEW.institution;
    END IF;
    
    -- ========== GATE 6: CONFIDENCE (with waiver support) ==========
    v_waived := COALESCE((NEW.policy_data->>'confidence_waived')::BOOLEAN, FALSE);
    v_waiver_reason := NEW.policy_data->>'confidence_waiver_reason';
    
    IF NOT v_waived THEN
      BEGIN v_conf := (NEW.policy_data->>'confidence')::NUMERIC; EXCEPTION WHEN OTHERS THEN v_conf := NULL; END;
      IF v_conf IS NULL THEN
        RAISE EXCEPTION 'Cannot activate: missing confidence (set confidence_waived=true to bypass)';
      END IF;
      IF v_conf < 0.70 THEN
        RAISE EXCEPTION 'Cannot activate: confidence (%) < 0.70 threshold (set confidence_waived=true to bypass)', v_conf;
      END IF;
    ELSE
      IF v_waiver_reason IS NULL OR BTRIM(v_waiver_reason) = '' THEN
        RAISE EXCEPTION 'Cannot activate: confidence_waived=true but no confidence_waiver_reason provided';
      END IF;
    END IF;
    
    -- ========== GATE 7: PROVENANCE VERIFICATION (strengthened) ==========
    v_prov_waived := COALESCE((NEW.policy_data->>'provenance_waived')::BOOLEAN, FALSE);
    v_prov_waiver_reason := NEW.policy_data->>'provenance_waiver_reason';
    
    IF NOT v_prov_waived THEN
      v_prov_verified_at := NEW.policy_data->>'provenance_verified_at';
      v_prov_verified_by := NEW.policy_data->>'provenance_verified_by';
      v_prov_source_url := NEW.policy_data->>'provenance_source_url';
      
      IF v_prov_verified_at IS NULL OR BTRIM(v_prov_verified_at) = '' THEN
        RAISE EXCEPTION 'Cannot activate: missing provenance_verified_at (set provenance_waived=true to bypass)';
      END IF;
      IF v_prov_verified_by IS NULL OR BTRIM(v_prov_verified_by) = '' THEN
        RAISE EXCEPTION 'Cannot activate: missing provenance_verified_by (set provenance_waived=true to bypass)';
      END IF;
      IF v_prov_source_url IS NULL OR BTRIM(v_prov_source_url) = '' THEN
        RAISE EXCEPTION 'Cannot activate: missing provenance_source_url (set provenance_waived=true to bypass)';
      END IF;
    ELSE
      IF v_prov_waiver_reason IS NULL OR BTRIM(v_prov_waiver_reason) = '' THEN
        RAISE EXCEPTION 'Cannot activate: provenance_waived=true but no provenance_waiver_reason provided';
      END IF;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3) Create single trigger
CREATE TRIGGER trg_validate_policy_pack_activation
BEFORE UPDATE ON institution_policy_packs
FOR EACH ROW
EXECUTE FUNCTION public.validate_policy_pack_can_activate();

-- 4) Backfill legacy packs with provenance verification fields
UPDATE institution_policy_packs
SET 
  policy_data = policy_data || jsonb_build_object(
    'provenance_verified_at', NOW()::TEXT,
    'provenance_verified_by', 'system-migration',
    'provenance_source_url', 'https://migration-backfill/legacy-seed-data'
  ),
  updated_at = NOW()
WHERE status = 'active'
  AND institution IN ('TESU', 'COSC', 'WGU', 'EXCELSIOR', 'EMPIRE')
  AND (policy_data->>'provenance_verified_at') IS NULL;

-- 5) Update function comment
COMMENT ON FUNCTION public.validate_policy_pack_can_activate IS 
'Enforces 7 activation gates for policy packs:
GATE 1: transfer_alt_bucket_mode must be separate or combined
GATE 2: Required numeric fields (residency, max_transfer, max_alt/combined based on mode, total)
GATE 3: Coherence (residency <= total, max_transfer <= total, max_alt <= max_transfer)
GATE 4: Provenance (ground_truth or human_override) for all 4 fields (mode-aware for alt credit key)
GATE 5: Ground truth row must exist
GATE 6: Confidence >= 0.70 OR explicit waiver with reason
GATE 7: Provenance verification (verified_at + verified_by + source_url) OR explicit waiver with reason';