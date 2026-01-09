-- Final hardening: Apply same integer validation to OLD values + BTRIM for whitespace tolerance
CREATE OR REPLACE FUNCTION public.validate_policy_pack_activation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  gt_residency INTEGER;
  gt_max_transfer INTEGER;
  pack_residency INTEGER;
  pack_max_transfer INTEGER;
  provenance_source TEXT;
  residency_txt TEXT;
  max_transfer_txt TEXT;
  old_residency_txt TEXT;
  old_max_transfer_txt TEXT;
  old_residency_val INTEGER;
  old_max_transfer_val INTEGER;
BEGIN
  -- ══════════════════════════════════════════════════════════════════
  -- GATE -1: Block direct INSERT as 'active' (must go through draft → activate flow)
  -- ══════════════════════════════════════════════════════════════════
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    RAISE EXCEPTION 'Cannot INSERT policy pack directly as active. Use draft → activate_policy_pack() flow.';
  END IF;

  -- ══════════════════════════════════════════════════════════════════
  -- IMMUTABILITY GUARD: Active rows cannot have critical fields modified
  -- ══════════════════════════════════════════════════════════════════
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' THEN
    -- Status change FROM active is allowed (superseding)
    IF NEW.status != 'active' THEN
      -- Allow superseding
      RETURN NEW;
    END IF;
    
    -- If staying active, block critical field changes with NULL-safe + integer validation
    old_residency_txt := NULLIF(BTRIM(OLD.policy_json->'residency_policy'->>'min_institutional_credits'), '');
    IF old_residency_txt IS NOT NULL AND old_residency_txt !~ '^\d+$' THEN
      RAISE EXCEPTION 'Active pack has invalid stored residency credits: %', old_residency_txt;
    END IF;
    old_residency_val := old_residency_txt::INTEGER;
    
    old_max_transfer_txt := NULLIF(BTRIM(OLD.policy_json->'transfer_policy'->>'max_transfer_credits'), '');
    IF old_max_transfer_txt IS NOT NULL AND old_max_transfer_txt !~ '^\d+$' THEN
      RAISE EXCEPTION 'Active pack has invalid stored max transfer credits: %', old_max_transfer_txt;
    END IF;
    old_max_transfer_val := old_max_transfer_txt::INTEGER;
    
    -- Extract NEW values with same validation
    residency_txt := NULLIF(BTRIM(NEW.policy_json->'residency_policy'->>'min_institutional_credits'), '');
    IF residency_txt IS NOT NULL AND residency_txt !~ '^\d+$' THEN
      RAISE EXCEPTION 'Cannot update to invalid residency credits: %', residency_txt;
    END IF;
    pack_residency := residency_txt::INTEGER;
    
    max_transfer_txt := NULLIF(BTRIM(NEW.policy_json->'transfer_policy'->>'max_transfer_credits'), '');
    IF max_transfer_txt IS NOT NULL AND max_transfer_txt !~ '^\d+$' THEN
      RAISE EXCEPTION 'Cannot update to invalid max transfer credits: %', max_transfer_txt;
    END IF;
    pack_max_transfer := max_transfer_txt::INTEGER;
    
    IF NEW.institution != OLD.institution
       OR pack_residency IS DISTINCT FROM old_residency_val
       OR pack_max_transfer IS DISTINCT FROM old_max_transfer_val THEN
      RAISE EXCEPTION 'Cannot modify critical fields on active policy pack. Create new draft instead. OLD: institution=%, residency=%, max_transfer=% | NEW: institution=%, residency=%, max_transfer=%',
        OLD.institution, old_residency_val, old_max_transfer_val,
        NEW.institution, pack_residency, pack_max_transfer;
    END IF;
    
    -- Non-critical updates allowed (metadata, notes, etc.)
    RETURN NEW;
  END IF;

  -- ══════════════════════════════════════════════════════════════════
  -- ACTIVATION GATES: Only fire when transitioning TO 'active'
  -- ══════════════════════════════════════════════════════════════════
  IF NOT (NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status != 'active')) THEN
    RETURN NEW;
  END IF;

  -- ══════════════════════════════════════════════════════════════════
  -- GATE 0: Integer validation - catch non-numeric strings before casting
  -- ══════════════════════════════════════════════════════════════════
  residency_txt := NULLIF(BTRIM(NEW.policy_json->'residency_policy'->>'min_institutional_credits'), '');
  IF residency_txt IS NOT NULL AND residency_txt !~ '^\d+$' THEN
    RAISE EXCEPTION 'Residency credits must be a numeric string, got: "%"', residency_txt;
  END IF;
  pack_residency := residency_txt::INTEGER;
  
  max_transfer_txt := NULLIF(BTRIM(NEW.policy_json->'transfer_policy'->>'max_transfer_credits'), '');
  IF max_transfer_txt IS NOT NULL AND max_transfer_txt !~ '^\d+$' THEN
    RAISE EXCEPTION 'Max transfer credits must be a numeric string, got: "%"', max_transfer_txt;
  END IF;
  pack_max_transfer := max_transfer_txt::INTEGER;

  -- ══════════════════════════════════════════════════════════════════
  -- GATE 1: Provenance key must exist
  -- ══════════════════════════════════════════════════════════════════
  IF NEW.provenance IS NULL OR NOT (NEW.provenance ? 'source') THEN
    RAISE EXCEPTION 'Cannot activate: provenance.source key is required';
  END IF;

  -- ══════════════════════════════════════════════════════════════════
  -- GATE 2: Provenance source must be ground_truth or human_override
  -- ══════════════════════════════════════════════════════════════════
  provenance_source := NEW.provenance->>'source';
  IF provenance_source NOT IN ('ground_truth', 'human_override') THEN
    RAISE EXCEPTION 'Cannot activate: provenance source "%" not allowed. Must be ground_truth or human_override.', provenance_source;
  END IF;

  -- ══════════════════════════════════════════════════════════════════
  -- GATE 3: Ground truth MUST exist for this institution (strict mode)
  -- ══════════════════════════════════════════════════════════════════
  SELECT residency_credits, max_transfer_credits
  INTO gt_residency, gt_max_transfer
  FROM institution_policy_ground_truth
  WHERE UPPER(institution) = UPPER(NEW.institution);
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cannot activate: No ground truth exists for institution "%". Add ground truth first.', NEW.institution;
  END IF;

  -- ══════════════════════════════════════════════════════════════════
  -- GATE 4: Critical values MUST match ground truth exactly
  -- ══════════════════════════════════════════════════════════════════
  IF pack_residency IS DISTINCT FROM gt_residency THEN
    RAISE EXCEPTION 'Cannot activate: Residency credits mismatch. Pack has %, ground truth requires %', 
      pack_residency, gt_residency;
  END IF;
  
  IF pack_max_transfer IS DISTINCT FROM gt_max_transfer THEN
    RAISE EXCEPTION 'Cannot activate: Max transfer credits mismatch. Pack has %, ground truth requires %', 
      pack_max_transfer, gt_max_transfer;
  END IF;

  RETURN NEW;
END;
$function$;