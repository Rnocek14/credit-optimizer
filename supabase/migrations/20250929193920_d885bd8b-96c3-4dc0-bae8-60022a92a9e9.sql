-- Create mapping table to bridge block IDs to requirement UUIDs
CREATE TABLE IF NOT EXISTS block_requirement_map (
  block_id TEXT PRIMARY KEY,
  program_id TEXT NOT NULL,
  requirement_id UUID NOT NULL REFERENCES program_requirements(id)
);

CREATE INDEX IF NOT EXISTS idx_brm_program ON block_requirement_map(program_id);

-- Create view for counts keyed by block_id
CREATE OR REPLACE VIEW requirement_option_counts_by_block AS
SELECT
  brm.block_id,
  roc.options_count,
  roc.has_ace_credit,
  roc.has_clep
FROM block_requirement_map brm
JOIN requirement_option_counts roc ON roc.requirement_id = brm.requirement_id;

-- Create view for full options keyed by block_id
CREATE OR REPLACE VIEW requirement_options_view_by_block AS
SELECT
  brm.block_id,
  ro.requirement_id,
  ro.option_kind,
  ro.option_ref_id AS course_id,
  mc.title,
  mc.credits,
  mc.cost_usd,
  mc.duration_weeks,
  mc.modality,
  mc.cri_score,
  mc.level,
  mc.skill_tags,
  p.id AS provider_id,
  p.name AS provider_name,
  p.type AS provider_type,
  CASE
    WHEN mc.cost_usd <= 250 AND COALESCE(mc.duration_weeks, 6) <= 6 THEN 'excellent'
    WHEN mc.cost_usd <= 800 THEN 'good'
    ELSE 'fair'
  END::TEXT AS transfer_fit
FROM block_requirement_map brm
JOIN requirement_options ro ON ro.requirement_id = brm.requirement_id
JOIN marketplace_courses mc ON mc.id = ro.option_ref_id AND ro.option_kind = 'course'
JOIN providers p ON p.id = mc.provider_id;

-- Populate initial mappings (examples - replace with actual block IDs)
-- BS CS mappings
INSERT INTO block_requirement_map (block_id, program_id, requirement_id)
SELECT 'y1-math', 'bs_cs', id
FROM program_requirements
WHERE program_id = 'bs_cs' AND name = 'College Mathematics'
ON CONFLICT (block_id) DO UPDATE SET requirement_id = EXCLUDED.requirement_id;

INSERT INTO block_requirement_map (block_id, program_id, requirement_id)
SELECT 'y1-intro-prog', 'bs_cs', id
FROM program_requirements
WHERE program_id = 'bs_cs' AND name = 'Introduction to Programming'
ON CONFLICT (block_id) DO UPDATE SET requirement_id = EXCLUDED.requirement_id;

INSERT INTO block_requirement_map (block_id, program_id, requirement_id)
SELECT 'y1-english-comp', 'bs_cs', id
FROM program_requirements
WHERE program_id = 'bs_cs' AND name = 'English Composition'
ON CONFLICT (block_id) DO UPDATE SET requirement_id = EXCLUDED.requirement_id;

-- BS IT mapping
INSERT INTO block_requirement_map (block_id, program_id, requirement_id)
SELECT 'y1-it-intro-prog', 'bs_it', id
FROM program_requirements
WHERE program_id = 'bs_it' AND name = 'Introduction to Programming'
ON CONFLICT (block_id) DO UPDATE SET requirement_id = EXCLUDED.requirement_id;