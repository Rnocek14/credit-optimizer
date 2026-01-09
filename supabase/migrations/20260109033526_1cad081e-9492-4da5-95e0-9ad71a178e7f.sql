-- Create ground truth table for validation of extracted policies
CREATE TABLE IF NOT EXISTS institution_policy_ground_truth (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution TEXT NOT NULL UNIQUE,
  academic_year TEXT,
  
  -- Key policy fields with verified values
  residency_credits INTEGER,
  max_transfer_credits INTEGER,
  max_ace_nccrs_credits INTEGER,
  
  -- Credit sources accepted
  accepts_clep BOOLEAN,
  accepts_dsst BOOLEAN,
  accepts_ap BOOLEAN,
  accepts_tecep BOOLEAN,
  accepts_portfolio BOOLEAN,
  
  -- Requirements
  capstone_required BOOLEAN,
  info_literacy_required BOOLEAN,
  cornerstone_required BOOLEAN,
  
  -- Metadata
  last_verified_at TIMESTAMPTZ DEFAULT now(),
  verified_by TEXT,
  source_url TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE institution_policy_ground_truth ENABLE ROW LEVEL SECURITY;

-- Allow public read access (reference data)
CREATE POLICY "Ground truth is publicly readable" 
ON institution_policy_ground_truth 
FOR SELECT 
USING (true);

-- Only authenticated users can modify (admin feature)
CREATE POLICY "Authenticated users can modify ground truth" 
ON institution_policy_ground_truth 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Seed with verified TESU values
INSERT INTO institution_policy_ground_truth (
  institution,
  academic_year,
  residency_credits,
  max_transfer_credits,
  max_ace_nccrs_credits,
  accepts_clep,
  accepts_dsst,
  accepts_ap,
  accepts_tecep,
  accepts_portfolio,
  capstone_required,
  info_literacy_required,
  cornerstone_required,
  verified_by,
  source_url,
  notes
) VALUES (
  'TESU',
  '2024-2025',
  15,
  117,
  90,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  false,
  'manual_verification',
  'https://tesu.smartcatalogiq.com/current/undergraduate-catalog',
  'Verified from official 2024-2025 catalog. 117 max transfer from 4-year, 90 max from 2-year or ACE/NCCRS. 15 credits residency requirement.'
) ON CONFLICT (institution) DO UPDATE SET
  academic_year = EXCLUDED.academic_year,
  residency_credits = EXCLUDED.residency_credits,
  max_transfer_credits = EXCLUDED.max_transfer_credits,
  max_ace_nccrs_credits = EXCLUDED.max_ace_nccrs_credits,
  accepts_clep = EXCLUDED.accepts_clep,
  accepts_dsst = EXCLUDED.accepts_dsst,
  accepts_ap = EXCLUDED.accepts_ap,
  accepts_tecep = EXCLUDED.accepts_tecep,
  accepts_portfolio = EXCLUDED.accepts_portfolio,
  capstone_required = EXCLUDED.capstone_required,
  info_literacy_required = EXCLUDED.info_literacy_required,
  cornerstone_required = EXCLUDED.cornerstone_required,
  verified_by = EXCLUDED.verified_by,
  source_url = EXCLUDED.source_url,
  notes = EXCLUDED.notes,
  updated_at = now();

-- Add index for quick lookups
CREATE INDEX IF NOT EXISTS idx_ground_truth_institution ON institution_policy_ground_truth(institution);