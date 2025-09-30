-- Seed data with all required fields
-- Step 1: Populate program_requirements
INSERT INTO program_requirements (program_id, requirement_block_id, year, category, name, credits_required)
SELECT 'bs_cs', rb.id, rb.level_year, rb.area, rb.title, COALESCE(rb.credits_needed, 0)
FROM requirement_blocks rb WHERE rb.slug IN ('foundations', 'mathematics', 'core-i', 'core-ii');

INSERT INTO program_requirements (program_id, requirement_block_id, year, category, name, credits_required)
SELECT 'bs_it', rb.id, rb.level_year, rb.area, rb.title, COALESCE(rb.credits_needed, 0)
FROM requirement_blocks rb WHERE rb.slug IN ('foundations', 'mathematics', 'core-i');

-- Step 2: Add course options
INSERT INTO requirement_options (requirement_id, option_kind, option_ref_id, transfer_eligible, credits_awarded)
SELECT pr.id, 'course', ec.id, true, ec.credits
FROM program_requirements pr
JOIN requirement_blocks rb ON rb.id = pr.requirement_block_id
JOIN edu_courses ec ON (
  (rb.slug = 'foundations' AND ec.code IN ('CS-101', 'CS-102'))
  OR (rb.slug = 'core-i' AND ec.code IN ('CS-201', 'CS-202'))
);

-- Step 3: Add transfer rules with all required fields
INSERT INTO transfer_rules (to_program_id, rule_kind, value, block_id, course_id, transfer_state, score, notes, active, details)
SELECT 'bs_cs', 'transfer_max', 60, pr.requirement_block_id, ro.option_ref_id, 'accepted', 0.95, 'ACE-recommended', true, '{}'::jsonb
FROM requirement_options ro
JOIN program_requirements pr ON pr.id = ro.requirement_id
JOIN requirement_blocks rb ON rb.id = pr.requirement_block_id
WHERE rb.slug IN ('foundations', 'core-i') AND pr.program_id = 'bs_cs'
LIMIT 5;