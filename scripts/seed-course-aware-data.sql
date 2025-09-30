-- Seed script: populate requirement_options and transfer_rules for testing
-- Run this to enable course-aware nodes feature

-- Step 1: Add course options to some blocks
-- (Links requirement blocks to edu_courses)

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
  FROM edu_courses 
  WHERE 
    -- For foundations block, add CS101, CS102, MATH141
    (rb.slug = 'foundations' AND code IN ('CS101', 'CS102', 'MATH141'))
    -- For Core I, add CS201, CS202, CS203
    OR (rb.slug = 'core-i' AND code IN ('CS201', 'CS202', 'CS203'))
    -- For Core II, add CS301, CS302, CS303
    OR (rb.slug = 'core-ii' AND code IN ('CS301', 'CS302', 'CS303'))
    -- For Data Analysis, add DS301, DS302
    OR (rb.slug = 'data-analysis' AND code IN ('DS301', 'DS302', 'MATH301'))
    -- For CS Electives, add advanced CS courses
    OR (rb.slug = 'cs-elec' AND code LIKE 'CS4%' LIMIT 3)
    -- For DS Electives, add DS courses
    OR (rb.slug = 'ds-elec' AND code LIKE 'DS4%' LIMIT 3)
    -- For SE Electives, add SE courses
    OR (rb.slug = 'se-elec' AND code LIKE 'SE4%' LIMIT 3)
  ORDER BY code
  LIMIT 5
) c
WHERE rb.slug IN (
  'foundations', 'core-i', 'core-ii', 'data-analysis',
  'cs-elec', 'ds-elec', 'se-elec'
)
ON CONFLICT DO NOTHING;

-- Step 2: Add transfer rules for some courses
-- (Shows which courses are accepted/conditional/rejected)

-- Accepted transfers (high score)
INSERT INTO transfer_rules (block_id, course_id, transfer_state, score, notes, updated_at)
SELECT 
  ro.requirement_id as block_id,
  ro.option_ref_id as course_id,
  'accepted' as transfer_state,
  0.95 as score,
  'ACE-recommended, widely accepted' as notes,
  now() as updated_at
FROM requirement_options ro
JOIN requirement_blocks rb ON rb.id = ro.requirement_id
WHERE rb.slug IN ('foundations', 'core-i')
  AND ro.option_kind = 'course'
LIMIT 5
ON CONFLICT (block_id, course_id) DO UPDATE
SET transfer_state = EXCLUDED.transfer_state,
    score = EXCLUDED.score,
    notes = EXCLUDED.notes,
    updated_at = now();

-- Conditional transfers (medium score)
INSERT INTO transfer_rules (block_id, course_id, transfer_state, score, notes, updated_at)
SELECT 
  ro.requirement_id as block_id,
  ro.option_ref_id as course_id,
  'conditional' as transfer_state,
  0.65 as score,
  'May require portfolio review' as notes,
  now() as updated_at
FROM requirement_options ro
JOIN requirement_blocks rb ON rb.id = ro.requirement_id
WHERE rb.slug IN ('core-ii', 'data-analysis')
  AND ro.option_kind = 'course'
LIMIT 3
ON CONFLICT (block_id, course_id) DO UPDATE
SET transfer_state = EXCLUDED.transfer_state,
    score = EXCLUDED.score,
    notes = EXCLUDED.notes,
    updated_at = now();

-- Rejected/unknown (low score or no transfer)
INSERT INTO transfer_rules (block_id, course_id, transfer_state, score, notes, updated_at)
SELECT 
  ro.requirement_id as block_id,
  ro.option_ref_id as course_id,
  'rejected' as transfer_state,
  0.2 as score,
  'Not eligible for transfer credit' as notes,
  now() as updated_at
FROM requirement_options ro
JOIN requirement_blocks rb ON rb.id = ro.requirement_id
WHERE rb.slug IN ('cs-elec', 'ds-elec')
  AND ro.option_kind = 'course'
LIMIT 2
ON CONFLICT (block_id, course_id) DO UPDATE
SET transfer_state = EXCLUDED.transfer_state,
    score = EXCLUDED.score,
    notes = EXCLUDED.notes,
    updated_at = now();

-- Verification queries
SELECT 'Requirement Options Created:' as step, COUNT(*) as count FROM requirement_options;
SELECT 'Transfer Rules Created:' as step, COUNT(*) as count FROM transfer_rules;

SELECT 
  rb.slug,
  rb.title,
  COUNT(DISTINCT ro.id) as options_count,
  COUNT(DISTINCT tr.id) as transfer_rules_count
FROM requirement_blocks rb
LEFT JOIN requirement_options ro ON ro.requirement_id = rb.id
LEFT JOIN transfer_rules tr ON tr.block_id = rb.id
WHERE rb.slug IN (
  'foundations', 'core-i', 'core-ii', 'data-analysis',
  'cs-elec', 'ds-elec', 'se-elec'
)
GROUP BY rb.id, rb.slug, rb.title
ORDER BY rb.level_year, rb.title;
