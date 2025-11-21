-- Create credit_transfer_rules table for tracking transfer agreements
CREATE TABLE IF NOT EXISTS credit_transfer_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_institution TEXT NOT NULL,
  source_course_code TEXT NOT NULL,
  target_institution TEXT NOT NULL,
  target_course_code TEXT,
  acceptance_status TEXT NOT NULL CHECK (acceptance_status IN ('accepted', 'elective', 'rejected')),
  rule_source TEXT,
  confidence DECIMAL(3, 2),
  evidence_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_credit_transfer_rules_target 
  ON credit_transfer_rules(target_institution);

CREATE INDEX IF NOT EXISTS idx_credit_transfer_rules_source 
  ON credit_transfer_rules(source_institution, source_course_code);

CREATE INDEX IF NOT EXISTS idx_credit_transfer_rules_lookup 
  ON credit_transfer_rules(target_institution, source_institution, source_course_code);

-- Enable RLS
ALTER TABLE credit_transfer_rules ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Allow public read access to transfer rules"
  ON credit_transfer_rules
  FOR SELECT
  TO public
  USING (true);

-- Insert sample transfer rules (SOPHIA → TESU/COSC)
INSERT INTO credit_transfer_rules 
  (source_institution, source_course_code, target_institution, target_course_code, acceptance_status, rule_source, confidence)
VALUES
  ('SOPHIA', 'CS1101', 'TESU', 'COS-101', 'accepted', 'ACE Credit', 0.95),
  ('SOPHIA', 'BUS1101', 'TESU', 'BUS-210', 'accepted', 'ACE Credit', 0.95),
  ('STUDYCOM', 'CS101', 'TESU', 'COS-101', 'accepted', 'ACE Credit', 0.90),
  ('STUDYCOM', 'BUS101', 'COSC', 'BUS-101', 'accepted', 'ACE Credit', 0.90),
  ('CLEP', 'CALCULUS', 'TESU', 'MAT-121', 'accepted', 'CLEP Equivalency', 1.00),
  ('CLEP', 'COMPOSITION', 'COSC', 'ENG-101', 'accepted', 'CLEP Equivalency', 1.00),
  ('SOPHIA', 'PSYCH101', 'TESU', NULL, 'elective', 'ACE Credit', 0.85),
  ('STUDYCOM', 'HISTORY101', 'COSC', NULL, 'elective', 'ACE Credit', 0.80);

-- Add comment
COMMENT ON TABLE credit_transfer_rules IS 'Tracks credit transfer agreements between institutions';
