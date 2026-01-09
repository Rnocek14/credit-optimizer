-- Step 1: Update trigger to support flat provenance keys (residency_credits, max_transfer_credits)
CREATE OR REPLACE FUNCTION validate_policy_pack_activation()
RETURNS TRIGGER AS $$
DECLARE
  res_val TEXT;
  max_val TEXT;
  res_src TEXT;
  max_src TEXT;
BEGIN
  -- Only validate on activation (status changing to 'active')
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    
    -- GATE 1: Require provenance_url
    IF NEW.provenance_url IS NULL OR BTRIM(NEW.provenance_url) = '' THEN
      RAISE EXCEPTION 'Cannot activate: provenance_url is required';
    END IF;
    
    -- GATE 2: Require residency_credits in policy_data
    res_val := NEW.policy_data->>'residency_credits';
    IF res_val IS NULL OR BTRIM(res_val) = '' THEN
      RAISE EXCEPTION 'Cannot activate: policy_data.residency_credits is required';
    END IF;
    
    -- GATE 3: Require max_transfer_credits in policy_data
    max_val := NEW.policy_data->>'max_transfer_credits';
    IF max_val IS NULL OR BTRIM(max_val) = '' THEN
      RAISE EXCEPTION 'Cannot activate: policy_data.max_transfer_credits is required';
    END IF;
    
    -- GATE 4: Require field_provenance object
    IF NEW.field_provenance IS NULL THEN
      RAISE EXCEPTION 'Cannot activate: field_provenance is required';
    END IF;
    
    -- GATE 5: Require provenance for residency_credits (check flat, prefixed, then legacy keys)
    IF (NEW.field_provenance ? 'residency_credits') THEN
      res_src := NEW.field_provenance->'residency_credits'->>'source';
    ELSIF (NEW.field_provenance ? 'policy_data.residency_credits') THEN
      res_src := NEW.field_provenance->'policy_data.residency_credits'->>'source';
    ELSIF (NEW.field_provenance ? 'residency_policy.min_institutional_credits') THEN
      res_src := NEW.field_provenance->'residency_policy.min_institutional_credits'->>'source';
    ELSE
      RAISE EXCEPTION 'Cannot activate: field_provenance missing residency key';
    END IF;
    
    IF res_src IS NULL OR res_src NOT IN ('ground_truth', 'verified', 'ai_high_confidence') THEN
      RAISE EXCEPTION 'Cannot activate: residency_credits provenance source must be ground_truth, verified, or ai_high_confidence (got: %)', COALESCE(res_src, 'NULL');
    END IF;
    
    -- GATE 6: Require provenance for max_transfer_credits (check flat, prefixed, then legacy keys)
    IF (NEW.field_provenance ? 'max_transfer_credits') THEN
      max_src := NEW.field_provenance->'max_transfer_credits'->>'source';
    ELSIF (NEW.field_provenance ? 'policy_data.max_transfer_credits') THEN
      max_src := NEW.field_provenance->'policy_data.max_transfer_credits'->>'source';
    ELSIF (NEW.field_provenance ? 'transfer_credit_limits.max_total_transfer_credits') THEN
      max_src := NEW.field_provenance->'transfer_credit_limits.max_total_transfer_credits'->>'source';
    ELSE
      RAISE EXCEPTION 'Cannot activate: field_provenance missing max_transfer key';
    END IF;
    
    IF max_src IS NULL OR max_src NOT IN ('ground_truth', 'verified', 'ai_high_confidence') THEN
      RAISE EXCEPTION 'Cannot activate: max_transfer_credits provenance source must be ground_truth, verified, or ai_high_confidence (got: %)', COALESCE(max_src, 'NULL');
    END IF;
    
    -- GATE 7: Require minimum confidence score
    IF NEW.confidence_score IS NULL OR NEW.confidence_score < 80 THEN
      RAISE EXCEPTION 'Cannot activate: confidence_score must be >= 80 (got: %)', COALESCE(NEW.confidence_score::TEXT, 'NULL');
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Set provenance_url for COSC draft pack
UPDATE institution_policy_packs
SET provenance_url = 'https://www.charteroak.edu/catalog/current/degree-requirements/undergraduate-academic-policies/'
WHERE id = '9fac4138-3f70-4c64-85aa-34c57bd1c005';

-- Step 3: Add CHECK constraint for future protection
ALTER TABLE institution_policy_packs
DROP CONSTRAINT IF EXISTS active_requires_provenance_url;

ALTER TABLE institution_policy_packs
ADD CONSTRAINT active_requires_provenance_url
CHECK (status != 'active' OR (provenance_url IS NOT NULL AND BTRIM(provenance_url) != ''));