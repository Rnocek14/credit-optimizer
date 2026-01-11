-- 1. Demote SNHU to draft (bucket_mode is unknown)
UPDATE institution_policy_packs
SET status = 'draft',
    updated_at = NOW()
WHERE institution = 'SNHU'
  AND status = 'active';

-- 2. Create or replace the activation validation trigger to enforce bucket mode
CREATE OR REPLACE FUNCTION validate_policy_pack_active_status()
RETURNS TRIGGER AS $$
DECLARE
  bucket_mode TEXT;
  has_ground_truth BOOLEAN;
  residency_provenance TEXT;
  transfer_provenance TEXT;
BEGIN
  -- Only validate when transitioning TO active status
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    
    -- GATE 1: Required core fields must exist
    IF (NEW.policy_data->>'residency_credits') IS NULL THEN
      RAISE EXCEPTION 'Cannot activate: missing residency_credits';
    END IF;
    
    IF (NEW.policy_data->>'max_transfer_credits') IS NULL THEN
      RAISE EXCEPTION 'Cannot activate: missing max_transfer_credits';
    END IF;
    
    IF (NEW.policy_data->>'degree_credit_total') IS NULL THEN
      RAISE EXCEPTION 'Cannot activate: missing degree_credit_total';
    END IF;
    
    -- GATE 2: Bucket mode must be known (separate or combined)
    bucket_mode := NEW.policy_data->>'transfer_alt_bucket_mode';
    IF bucket_mode IS NULL OR bucket_mode NOT IN ('separate', 'combined') THEN
      RAISE EXCEPTION 'Cannot activate: transfer_alt_bucket_mode must be "separate" or "combined", got "%"', COALESCE(bucket_mode, 'null');
    END IF;
    
    -- GATE 3: Mode-specific caps must exist
    IF bucket_mode = 'separate' THEN
      IF (NEW.policy_data->>'max_alt_credit') IS NULL THEN
        RAISE EXCEPTION 'Cannot activate: separate bucket mode requires max_alt_credit';
      END IF;
    ELSIF bucket_mode = 'combined' THEN
      IF (NEW.policy_data->>'max_transfer_alt_combined_credits') IS NULL THEN
        RAISE EXCEPTION 'Cannot activate: combined bucket mode requires max_transfer_alt_combined_credits';
      END IF;
    END IF;
    
    -- GATE 4: Provenance must exist (verified_at or excerpt)
    IF (NEW.policy_data->>'provenance_verified_at') IS NULL 
       AND (NEW.policy_data->>'provenance_excerpt') IS NULL THEN
      RAISE EXCEPTION 'Cannot activate: missing provenance verification (provenance_verified_at or provenance_excerpt required)';
    END IF;
    
    -- GATE 5: Provenance source must be ground_truth or human_override (not ai_extraction)
    IF NEW.field_provenance IS NOT NULL THEN
      residency_provenance := NEW.field_provenance->'residency_credits'->>'source';
      transfer_provenance := NEW.field_provenance->'max_transfer_credits'->>'source';
      
      IF residency_provenance IS NOT NULL AND residency_provenance NOT IN ('ground_truth', 'human_override') THEN
        RAISE EXCEPTION 'Cannot activate: residency_credits provenance source must be ground_truth or human_override, got "%"', residency_provenance;
      END IF;
      
      IF transfer_provenance IS NOT NULL AND transfer_provenance NOT IN ('ground_truth', 'human_override') THEN
        RAISE EXCEPTION 'Cannot activate: max_transfer_credits provenance source must be ground_truth or human_override, got "%"', transfer_provenance;
      END IF;
    END IF;
    
    -- GATE 6: Ground truth row must exist
    SELECT EXISTS (
      SELECT 1 FROM institution_policy_ground_truth
      WHERE institution = NEW.institution
    ) INTO has_ground_truth;
    
    IF NOT has_ground_truth THEN
      RAISE EXCEPTION 'Cannot activate: no ground truth record exists for institution %', NEW.institution;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists and recreate
DROP TRIGGER IF EXISTS check_policy_pack_activation ON institution_policy_packs;
CREATE TRIGGER check_policy_pack_activation
  BEFORE INSERT OR UPDATE ON institution_policy_packs
  FOR EACH ROW
  EXECUTE FUNCTION validate_policy_pack_active_status();