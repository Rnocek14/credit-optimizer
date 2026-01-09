-- Phase 1: Update COSC URL templates with static, scrapeable catalog pages
DELETE FROM scrape_url_templates WHERE institution_code = 'COSC';

INSERT INTO scrape_url_templates (institution_code, url, page_type, priority) VALUES
  ('COSC', 'https://www.charteroak.edu/catalog/current/degree-requirements/undergraduate-academic-policies/', 'residency', 1),
  ('COSC', 'https://www.charteroak.edu/catalog/current/transfer-credit/course-transfer-policy-undergraduate/', 'transfer_policy', 2),
  ('COSC', 'https://www.charteroak.edu/catalog/current/', 'catalog', 3);

-- Phase 2: Extend Ground Truth schema for degree-level values
ALTER TABLE institution_policy_ground_truth 
  ADD COLUMN IF NOT EXISTS residency_credits_associate INTEGER,
  ADD COLUMN IF NOT EXISTS residency_credits_bachelors INTEGER,
  ADD COLUMN IF NOT EXISTS total_credits_required_associate INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS total_credits_required_bachelors INTEGER DEFAULT 120,
  ADD COLUMN IF NOT EXISTS max_transfer_rule TEXT;

-- Add unique constraint for upsert support
ALTER TABLE institution_policy_ground_truth 
  ADD CONSTRAINT institution_policy_ground_truth_institution_year_unique 
  UNIQUE (institution, academic_year);

-- Add comments for documentation
COMMENT ON COLUMN institution_policy_ground_truth.residency_credits_associate IS 'Minimum institutional credits required for associate degrees';
COMMENT ON COLUMN institution_policy_ground_truth.residency_credits_bachelors IS 'Minimum institutional credits required for bachelor degrees';
COMMENT ON COLUMN institution_policy_ground_truth.max_transfer_rule IS 'Rule for computing max transfer (e.g., total_credits_required - residency_credits)';

-- Phase 3: Seed COSC Ground Truth with degree-level values from official catalog
-- First delete any existing COSC entry to avoid conflicts
DELETE FROM institution_policy_ground_truth WHERE institution = 'COSC';

INSERT INTO institution_policy_ground_truth (
  institution,
  academic_year,
  residency_credits,
  max_transfer_credits,
  residency_credits_associate,
  residency_credits_bachelors,
  total_credits_required_associate,
  total_credits_required_bachelors,
  max_transfer_rule,
  accepts_clep,
  accepts_dsst,
  accepts_ap,
  accepts_portfolio,
  cornerstone_required,
  capstone_required,
  source_url,
  verified_by,
  notes
) VALUES (
  'COSC',
  '2024-2025',
  6,
  114,
  3,
  6,
  60,
  120,
  'total_credits_required - residency_credits',
  true,
  true,
  true,
  true,
  true,
  true,
  'https://www.charteroak.edu/catalog/current/degree-requirements/undergraduate-academic-policies/',
  'manual_verification',
  'Cornerstone (3cr) required for all degrees. Capstone (3cr) required for bachelor''s and cannot be transferred. Max transfer computed as total - residency.'
);