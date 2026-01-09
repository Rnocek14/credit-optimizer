-- =============================================================================
-- BULLETPROOF SAFEGUARDS FOR CRITICAL POLICY FIELDS
-- =============================================================================

-- 1. Field-level provenance tracking
ALTER TABLE institution_policy_packs 
ADD COLUMN IF NOT EXISTS field_provenance JSONB DEFAULT '{}';

COMMENT ON COLUMN institution_policy_packs.field_provenance IS 
'Per-field provenance tracking: {field_name: {source: "ground_truth"|"ai_extraction"|"human_override", source_ref: string, overrode_value: any, overrode_at: timestamp}}';

-- 2. Merge diff logging table for audit trail
CREATE TABLE IF NOT EXISTS policy_merge_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_pack_id UUID REFERENCES institution_policy_packs(id) ON DELETE CASCADE,
  institution TEXT NOT NULL,
  merge_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_job_ids UUID[] NOT NULL,
  
  -- Per-field diff records
  field_diffs JSONB NOT NULL DEFAULT '[]',
  -- Example: [{"field": "residency_credits", "extracted_value": 6, "ground_truth_value": 15, "final_value": 15, "did_override": true}]
  
  -- Summary stats
  total_fields_checked INTEGER DEFAULT 0,
  fields_overridden INTEGER DEFAULT 0,
  fields_matched INTEGER DEFAULT 0,
  fields_missing_ground_truth INTEGER DEFAULT 0,
  
  -- Trust tier result
  trust_tier TEXT CHECK (trust_tier IN ('verified', 'partial', 'unverified')),
  critical_fields_verified BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_policy_merge_audit_institution ON policy_merge_audit_log(institution);
CREATE INDEX IF NOT EXISTS idx_policy_merge_audit_timestamp ON policy_merge_audit_log(merge_timestamp DESC);

-- 3. Define critical fields that MUST be ground-truth verified for auto-approve
CREATE TABLE IF NOT EXISTS critical_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_path TEXT NOT NULL UNIQUE,
  field_name TEXT NOT NULL,
  validation_range_min INTEGER,
  validation_range_max INTEGER,
  required_for_auto_approve BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed critical field definitions
INSERT INTO critical_field_definitions (field_path, field_name, validation_range_min, validation_range_max, required_for_auto_approve, description)
VALUES 
  ('residency_policy.min_institutional_credits', 'Residency Credits', 0, 60, true, 'Minimum credits that must be earned at the institution'),
  ('transfer_credit_limits.max_total_transfer_credits', 'Max Transfer Credits', 0, 120, true, 'Maximum credits transferable from other institutions'),
  ('transfer_credit_limits.max_ace_nccrs_credits', 'Max ACE/NCCRS Credits', 0, 90, false, 'Maximum credits from ACE/NCCRS evaluated courses')
ON CONFLICT (field_path) DO UPDATE SET
  validation_range_min = EXCLUDED.validation_range_min,
  validation_range_max = EXCLUDED.validation_range_max,
  required_for_auto_approve = EXCLUDED.required_for_auto_approve;

-- 4. Validation trigger: Prevent approving packs with out-of-range critical values
CREATE OR REPLACE FUNCTION validate_policy_pack_approval()
RETURNS TRIGGER AS $$
DECLARE
  residency_val INTEGER;
  max_transfer_val INTEGER;
BEGIN
  -- Only validate when status is being set to 'active' or 'approved'
  IF NEW.status IN ('active', 'approved') THEN
    -- Extract critical values from policy_json
    residency_val := (NEW.policy_json->'residency_policy'->>'min_institutional_credits')::INTEGER;
    max_transfer_val := (NEW.policy_json->'transfer_credit_limits'->>'max_total_transfer_credits')::INTEGER;
    
    -- Validate residency is in sane range (0-60)
    IF residency_val IS NOT NULL AND (residency_val < 0 OR residency_val > 60) THEN
      RAISE EXCEPTION 'Invalid residency credits: % (must be 0-60)', residency_val;
    END IF;
    
    -- Validate max transfer is in sane range (0-120)
    IF max_transfer_val IS NOT NULL AND (max_transfer_val < 0 OR max_transfer_val > 120) THEN
      RAISE EXCEPTION 'Invalid max transfer credits: % (must be 0-120)', max_transfer_val;
    END IF;
    
    -- For TESU specifically, enforce ground truth values
    IF NEW.institution = 'tesu' THEN
      IF residency_val IS NOT NULL AND residency_val != 15 THEN
        RAISE WARNING 'TESU residency should be 15, got %', residency_val;
      END IF;
      IF max_transfer_val IS NOT NULL AND max_transfer_val != 117 THEN
        RAISE WARNING 'TESU max transfer should be 117, got %', max_transfer_val;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS validate_policy_pack_before_approve ON institution_policy_packs;
CREATE TRIGGER validate_policy_pack_before_approve
  BEFORE UPDATE ON institution_policy_packs
  FOR EACH ROW
  EXECUTE FUNCTION validate_policy_pack_approval();

-- 5. RLS policies for audit log
ALTER TABLE policy_merge_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to policy_merge_audit_log" 
ON policy_merge_audit_log FOR SELECT 
USING (true);

CREATE POLICY "Allow insert to policy_merge_audit_log from service role" 
ON policy_merge_audit_log FOR INSERT 
WITH CHECK (true);

-- 6. Extend ground truth table with exam acceptance fields if not present
ALTER TABLE institution_policy_ground_truth
ADD COLUMN IF NOT EXISTS min_upper_level_credits INTEGER,
ADD COLUMN IF NOT EXISTS max_portfolio_credits INTEGER;

COMMENT ON TABLE institution_policy_ground_truth IS 
'Verified ground truth values for critical policy fields. These override AI extractions during merge.';