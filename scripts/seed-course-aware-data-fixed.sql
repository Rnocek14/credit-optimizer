-- Seed script: populate requirement_options and transfer_rules for testing
-- Run this to enable course-aware nodes feature

-- Step 1: Add course options to some blocks
-- (Links requirement blocks to edu_courses using proper subqueries)

INSERT INTO requirement_options (requirement_id, option_kind, option_ref_id, transfer_eligible, credits_awarded)
SELECT 
  rb.id as requirement_id,
  'course' as option_kind,
  c.id as option_ref_id,
  true as transfer_eligible,
  c.credits as credits_awarded
FROM requirement_blocks rb
CROSS JOIN LATERAL (
  SELECT id, credits 
  FROM (
    SELECT id, credits, code
    FROM edu_courses 
    WHERE 
      (rb.slug = 'foundations' AND code IN ('CS101', 'CS102', 'MATH141'))
      OR (rb.slug = 'core-i' AND code IN ('CS201', 'CS202', 'CS203'))
      OR (rb.slug = 'core-ii' AND code IN ('CS301', 'CS302', 'CS303'))
      OR (rb.slug = 'data-analysis' AND code IN ('DS301', 'DS302', 'MATH301'))
      OR (rb.slug = 'cs-elec' AND code LIKE 'CS4%')
      OR (rb.slug = 'ds-elec' AND code LIKE 'DS4%')
      OR (rb.slug = 'se-elec' AND code LIKE 'SE4%')
    ORDER BY code
    LIMIT 5
  ) sub
) c
WHERE rb.slug IN ('foundations', 'core-i', 'core-ii', 'data-analysis', 'cs-elec', 'ds-elec', 'se-elec')
ON CONFLICT DO NOTHING;

-- Step 2: Add transfer rules - Accepted (high score)
INSERT INTO transfer_rules (block_id, course_id, transfer_state, score, notes)
SELECT 
  ro.requirement_id as block_id,
  ro.option_ref_id as course_id,
  'accepted' as transfer_state,
  0.95 as score,
  'ACE-recommended, widely accepted' as notes
FROM requirement_options ro
JOIN requirement_blocks rb ON rb.id = ro.requirement_id
WHERE rb.slug IN ('foundations', 'core-i') 
  AND ro.option_kind = 'course'
LIMIT 5
ON CONFLICT (block_id, course_id) DO UPDATE
SET transfer_state = EXCLUDED.transfer_state, 
    score = EXCLUDED.score, 
    notes = EXCLUDED.notes;

-- Conditional transfers (medium score)
INSERT INTO transfer_rules (block_id, course_id, transfer_state, score, notes)
SELECT 
  ro.requirement_id as block_id,
  ro.option_ref_id as course_id,
  'conditional' as transfer_state,
  0.65 as score,
  'May require portfolio review' as notes
FROM requirement_options ro
JOIN requirement_blocks rb ON rb.id = ro.requirement_id
WHERE rb.slug IN ('core-ii', 'data-analysis') 
  AND ro.option_kind = 'course'
LIMIT 3
ON CONFLICT (block_id, course_id) DO UPDATE
SET transfer_state = EXCLUDED.transfer_state, 
    score = EXCLUDED.score, 
    notes = EXCLUDED.notes;

-- Rejected (low score)
INSERT INTO transfer_rules (block_id, course_id, transfer_state, score, notes)
SELECT 
  ro.requirement_id as block_id,
  ro.option_ref_id as course_id,
  'rejected' as transfer_state,
  0.2 as score,
  'Not eligible for transfer credit' as notes
FROM requirement_options ro
JOIN requirement_blocks rb ON rb.id = ro.requirement_id
WHERE rb.slug IN ('cs-elec', 'ds-elec') 
  AND ro.option_kind = 'course'
LIMIT 2
ON CONFLICT (block_id, course_id) DO UPDATE
SET transfer_state = EXCLUDED.transfer_state, 
    score = EXCLUDED.score, 
    notes = EXCLUDED.notes;

-- Verification queries
SELECT 'Requirement Options:' as step, COUNT(*) as count FROM requirement_options;
SELECT 'Transfer Rules:' as step, COUNT(*) as count FROM transfer_rules;
