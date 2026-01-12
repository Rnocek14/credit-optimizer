-- Transfer Outcomes Table (Tier 1 & Tier 6 Evidence)
-- This is the source of truth for actual transfer results
-- Keeps transfer_outcomes separate from credit_transfer_rules (rules vs outcomes)

CREATE TABLE IF NOT EXISTS transfer_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Course identification
  source_institution TEXT NOT NULL,
  source_course_code TEXT NOT NULL,
  source_course_title TEXT,
  target_institution TEXT NOT NULL,
  
  -- Outcome details
  outcome_type TEXT NOT NULL CHECK (outcome_type IN (
    'degree_awarded',        -- Tier 1: Ultimate proof
    'requirement_satisfied', -- Tier 1: Slot filled
    'transcript_accepted',   -- Tier 3: On record
    'elective_only',         -- Partial success
    'rejected',              -- Tier 6: Hard no
    'cap_exceeded',          -- Tier 6: Limit hit
    'grade_insufficient'     -- Tier 6: Didn't meet min
  )),
  
  -- Context
  degree_program TEXT,
  catalog_year TEXT,
  credits_applied NUMERIC(4,1),
  credits_requested NUMERIC(4,1),
  grade_received TEXT,
  
  -- Evidence uploads
  has_transcript_evidence BOOLEAN DEFAULT false,
  has_degree_audit_evidence BOOLEAN DEFAULT false,
  evidence_url TEXT,
  evidence_notes TEXT,
  
  -- Metadata
  outcome_date DATE,
  reported_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  
  -- Privacy control
  is_public BOOLEAN DEFAULT true,  -- Contributes to crowd signal when true
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate reports for same course/institution combo per user
  UNIQUE(user_id, source_institution, source_course_code, target_institution, outcome_type)
);

-- Indexes for common queries
CREATE INDEX idx_transfer_outcomes_user ON transfer_outcomes(user_id);
CREATE INDEX idx_transfer_outcomes_target ON transfer_outcomes(target_institution);
CREATE INDEX idx_transfer_outcomes_source ON transfer_outcomes(source_institution, source_course_code);
CREATE INDEX idx_transfer_outcomes_lookup ON transfer_outcomes(target_institution, source_institution, source_course_code);
CREATE INDEX idx_transfer_outcomes_public ON transfer_outcomes(is_public) WHERE is_public = true;
CREATE INDEX idx_transfer_outcomes_type ON transfer_outcomes(outcome_type);

-- Enable RLS
ALTER TABLE transfer_outcomes ENABLE ROW LEVEL SECURITY;

-- Users can manage their own outcomes
CREATE POLICY "Users can view their own outcomes"
  ON transfer_outcomes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own outcomes"
  ON transfer_outcomes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own outcomes"
  ON transfer_outcomes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own outcomes"
  ON transfer_outcomes FOR DELETE
  USING (auth.uid() = user_id);

-- Public outcomes visible to all authenticated users (for crowd signals)
CREATE POLICY "Public outcomes visible to authenticated users"
  ON transfer_outcomes FOR SELECT
  USING (is_public = true AND auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_transfer_outcomes_updated_at
  BEFORE UPDATE ON transfer_outcomes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE transfer_outcomes IS 'Tracks actual transfer outcomes (success/rejection) for evidence-driven confidence scoring';

-- ADDITIVE changes to credit_transfer_rules (no constraint drops)
-- Adding new columns without modifying existing constraints

ALTER TABLE credit_transfer_rules 
  ADD COLUMN IF NOT EXISTS catalog_year_start TEXT,
  ADD COLUMN IF NOT EXISTS catalog_year_end TEXT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS decay_after_months INTEGER DEFAULT 24,
  ADD COLUMN IF NOT EXISTS last_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS success_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rejection_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_outcome_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS degree_family TEXT,
  ADD COLUMN IF NOT EXISTS degree_program TEXT,
  ADD COLUMN IF NOT EXISTS provenance_notes TEXT;

-- Add evidence_type column if not exists (additive, no constraint yet)
ALTER TABLE credit_transfer_rules 
  ADD COLUMN IF NOT EXISTS evidence_type TEXT;

-- Index for temporal queries
CREATE INDEX IF NOT EXISTS idx_credit_transfer_rules_temporal 
  ON credit_transfer_rules(last_confirmed_at, expires_at);

CREATE INDEX IF NOT EXISTS idx_credit_transfer_rules_outcomes 
  ON credit_transfer_rules(success_count, rejection_count);

-- Comment on new columns
COMMENT ON COLUMN credit_transfer_rules.evidence_type IS 'Type of evidence supporting this rule (graduation_confirmed, equivalency_table, etc.)';
COMMENT ON COLUMN credit_transfer_rules.success_count IS 'Cached count of successful transfer outcomes (derived from transfer_outcomes)';
COMMENT ON COLUMN credit_transfer_rules.rejection_count IS 'Cached count of rejected transfer outcomes (derived from transfer_outcomes)';