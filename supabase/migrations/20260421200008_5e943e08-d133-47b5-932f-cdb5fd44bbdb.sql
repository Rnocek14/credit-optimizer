
-- Hybrid trust gate: accept 'auto_defaulted' provenance only when value matches
-- known safe defaults AND confidence is high. Keeps all other gates intact (GT existence,
-- coherence, confidence floor, provenance verification metadata).

CREATE OR REPLACE FUNCTION public.validate_policy_pack_can_activate()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
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

  v_prov_residency TEXT;
  v_prov_max_transfer TEXT;
  v_prov_max_alt TEXT;
  v_prov_total TEXT;
  v_alt_key TEXT;

  v_prov_verified_at TEXT;
  v_prov_verified_by TEXT;
  v_prov_source_url TEXT;
  v_prov_waived BOOLEAN;
  v_prov_waiver_reason TEXT;

  -- Hybrid acceptance helpers
  v_auto_default_ok_residency BOOLEAN;
  v_auto_default_ok_total BOOLEAN;
  v_auto_default_ok_bucket BOOLEAN;
  v_auto_default_min_confidence CONSTANT NUMERIC := 0.80;
BEGIN
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status IS DISTINCT FROM 'active') THEN

    -- Pre-compute confidence (used by the auto_defaulted acceptance check)
    BEGIN v_conf := (NEW.policy_data->>'confidence')::NUMERIC; EXCEPTION WHEN OTHERS THEN v_conf := NULL; END;

    -- ========== GATE 1: BUCKET MODE ==========
    v_bucket_mode := NEW.policy_data->>'transfer_alt_bucket_mode';
    IF v_bucket_mode IS NULL OR v_bucket_mode NOT IN ('separate', 'combined') THEN
      RAISE EXCEPTION 'Cannot activate: transfer_alt_bucket_mode must be "separate" or "combined", got "%"', COALESCE(v_bucket_mode, 'null');
    END IF;

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

    IF v_residency IS NULL THEN RAISE EXCEPTION 'Cannot activate: missing residency_credits'; END IF;
    IF v_max_transfer IS NULL THEN RAISE EXCEPTION 'Cannot activate: missing max_transfer_credits'; END IF;
    IF v_total IS NULL THEN RAISE EXCEPTION 'Cannot activate: missing degree_credit_total'; END IF;
    IF v_max_alt IS NULL THEN RAISE EXCEPTION 'Cannot activate: missing % (required for % mode)', v_alt_key, v_bucket_mode; END IF;

    -- ========== GATE 3: COHERENCE CHECKS ==========
    IF v_residency > v_total THEN RAISE EXCEPTION 'Cannot activate: residency_credits (%) > degree_credit_total (%)', v_residency, v_total; END IF;
    IF v_max_transfer > v_total THEN RAISE EXCEPTION 'Cannot activate: max_transfer_credits (%) > degree_credit_total (%)', v_max_transfer, v_total; END IF;
    IF v_max_alt > v_max_transfer THEN RAISE EXCEPTION 'Cannot activate: % (%) > max_transfer_credits (%)', v_alt_key, v_max_alt, v_max_transfer; END IF;

    -- ========== GATE 4: PROVENANCE (with hybrid auto_defaulted acceptance) ==========
    v_prov_residency  := COALESCE(NEW.field_provenance->'residency_credits'->>'source',     NEW.field_provenance->>'residency_credits',     '');
    v_prov_max_transfer := COALESCE(NEW.field_provenance->'max_transfer_credits'->>'source', NEW.field_provenance->>'max_transfer_credits', '');
    v_prov_total      := COALESCE(NEW.field_provenance->'degree_credit_total'->>'source',   NEW.field_provenance->>'degree_credit_total',   '');
    v_prov_max_alt    := COALESCE(NEW.field_provenance->v_alt_key->>'source',                NEW.field_provenance->>v_alt_key,                '');

    -- Hybrid acceptance: auto_defaulted is OK ONLY when value sits in the known safe range
    -- AND confidence >= 0.80. This protects trust while unlocking promotion.
    v_auto_default_ok_total := (
      v_total IN (60, 120, 180)
      AND v_conf IS NOT NULL AND v_conf >= v_auto_default_min_confidence
    );

    -- Residency safe range: 25% accreditation floor for the matching degree size
    -- (60->15, 120->30, 180->45) plus common explicit policies (24, 30, 45).
    v_auto_default_ok_residency := (
      (
        (v_total = 60  AND v_residency BETWEEN 15 AND 30)
        OR (v_total = 120 AND v_residency BETWEEN 24 AND 45)
        OR (v_total = 180 AND v_residency BETWEEN 30 AND 60)
      )
      AND v_conf IS NOT NULL AND v_conf >= v_auto_default_min_confidence
    );

    v_auto_default_ok_bucket := (
      v_bucket_mode = 'separate'
      AND v_conf IS NOT NULL AND v_conf >= v_auto_default_min_confidence
    );

    -- residency_credits provenance gate
    IF v_prov_residency NOT IN ('ground_truth', 'human_override') THEN
      IF v_prov_residency = 'auto_defaulted' AND v_auto_default_ok_residency THEN
        NULL; -- accept
      ELSE
        RAISE EXCEPTION 'Cannot activate: invalid provenance for residency_credits (got "%", value=%, total=%, conf=%)',
          v_prov_residency, v_residency, v_total, COALESCE(v_conf::TEXT,'null');
      END IF;
    END IF;

    -- max_transfer_credits provenance gate (no auto_default acceptance — must be derived from real source)
    IF v_prov_max_transfer NOT IN ('ground_truth', 'human_override') THEN
      RAISE EXCEPTION 'Cannot activate: invalid provenance for max_transfer_credits (got "%")', v_prov_max_transfer;
    END IF;

    -- max_alt provenance gate (allow auto_defaulted when bucket_mode/total are in safe ranges)
    IF v_prov_max_alt NOT IN ('ground_truth', 'human_override') THEN
      IF v_prov_max_alt = 'auto_defaulted' AND v_auto_default_ok_bucket AND v_auto_default_ok_total THEN
        NULL; -- accept
      ELSE
        RAISE EXCEPTION 'Cannot activate: invalid provenance for % (got "%")', v_alt_key, v_prov_max_alt;
      END IF;
    END IF;

    -- degree_credit_total provenance gate (allow auto_defaulted when value is in safe range)
    IF v_prov_total NOT IN ('ground_truth', 'human_override') THEN
      IF v_prov_total = 'auto_defaulted' AND v_auto_default_ok_total THEN
        NULL; -- accept
      ELSE
        RAISE EXCEPTION 'Cannot activate: invalid provenance for degree_credit_total (got "%")', v_prov_total;
      END IF;
    END IF;

    -- ========== GATE 5: GROUND TRUTH ROW EXISTS ==========
    SELECT EXISTS (
      SELECT 1 FROM institution_policy_ground_truth WHERE institution = NEW.institution
    ) INTO v_has_ground_truth;
    IF NOT v_has_ground_truth THEN
      RAISE EXCEPTION 'Cannot activate: no ground truth record exists for institution %', NEW.institution;
    END IF;

    -- ========== GATE 6: CONFIDENCE (with waiver support) ==========
    v_waived := COALESCE((NEW.policy_data->>'confidence_waived')::BOOLEAN, FALSE);
    v_waiver_reason := NEW.policy_data->>'confidence_waiver_reason';
    IF NOT v_waived THEN
      IF v_conf IS NULL THEN
        RAISE EXCEPTION 'Cannot activate: missing confidence (set confidence_waived=true to bypass)';
      END IF;
      IF v_conf < 0.70 THEN
        RAISE EXCEPTION 'Cannot activate: confidence (%) < 0.70 threshold', v_conf;
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
      v_prov_source_url  := NEW.policy_data->>'provenance_source_url';
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
$function$;
