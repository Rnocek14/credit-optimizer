-- Course-Aware Nodes: 60-Second Smoke Test
-- Run these queries one by one and watch the EduTree UI update

-- ============================================
-- TEST 1: Update Block Title
-- Expected: Node title changes + v:xxxx updates
-- ============================================
UPDATE public.requirement_blocks 
SET title = 'Updated Foundations', updated_at = now() 
WHERE slug = 'y1-found';

-- Verify the change
SELECT id, slug, title, updated_at 
FROM public.requirement_blocks 
WHERE slug = 'y1-found';

-- RESTORE
UPDATE public.requirement_blocks 
SET title = 'Foundations', updated_at = now() 
WHERE slug = 'y1-found';


-- ============================================
-- TEST 2: Add Course Option
-- Expected: "Options: N" increases + list updates + v:xxxx updates
-- ============================================

-- Check current options count
SELECT COUNT(*) as current_options_count
FROM public.requirement_options 
WHERE requirement_id = (SELECT id FROM public.requirement_blocks WHERE slug = 'y1-found');

-- Add a new course option
INSERT INTO public.requirement_options (requirement_id, option_kind, option_ref_id, transfer_eligible)
SELECT 
  (SELECT id FROM public.requirement_blocks WHERE slug = 'y1-found'),
  'course',
  (SELECT id FROM public.edu_courses WHERE code LIKE 'CS%' ORDER BY random() LIMIT 1),
  true
ON CONFLICT DO NOTHING
RETURNING id, requirement_id, option_kind, option_ref_id;

-- Verify the new count
SELECT COUNT(*) as new_options_count
FROM public.requirement_options 
WHERE requirement_id = (SELECT id FROM public.requirement_blocks WHERE slug = 'y1-found');

-- CLEANUP (optional)
-- DELETE FROM public.requirement_options 
-- WHERE id = '<insert_id_from_above>';


-- ============================================
-- TEST 3: Update Transfer State
-- Expected: Chip changes color (green for accepted) + v:xxxx updates
-- ============================================

-- Check current transfer rules
SELECT id, block_id, course_id, transfer_state, score
FROM public.transfer_rules 
WHERE block_id = (SELECT id FROM public.requirement_blocks WHERE slug = 'y1-found')
LIMIT 3;

-- Insert or update a transfer rule
INSERT INTO public.transfer_rules (block_id, course_id, transfer_state, score, notes, updated_at)
VALUES (
  (SELECT id FROM public.requirement_blocks WHERE slug = 'y1-found'),
  (SELECT id FROM public.edu_courses WHERE code LIKE 'CS%' LIMIT 1),
  'accepted',
  0.95,
  'Smoke test: accepted transfer rule',
  now()
)
ON CONFLICT (id) DO UPDATE
SET transfer_state = 'accepted', score = 0.95, notes = 'Smoke test updated', updated_at = now()
RETURNING id, block_id, course_id, transfer_state, score;

-- Try different states
UPDATE public.transfer_rules 
SET transfer_state = 'conditional', score = 0.70, updated_at = now()
WHERE block_id = (SELECT id FROM public.requirement_blocks WHERE slug = 'y1-found')
LIMIT 1
RETURNING id, transfer_state, score;

-- RESTORE to accepted
UPDATE public.transfer_rules 
SET transfer_state = 'accepted', score = 0.95, updated_at = now()
WHERE block_id = (SELECT id FROM public.requirement_blocks WHERE slug = 'y1-found');


-- ============================================
-- TEST 4: Select Course (User Plan)
-- Expected: "Selected" pill appears on chosen course + v:xxxx updates
-- ============================================

-- Note: This requires an active user session and plan_id
-- If you're testing manually, use the UI to select a course instead
-- Or provide your test user_id and plan_id below:

-- Example (replace with actual IDs):
/*
INSERT INTO public.user_plan_courses (plan_id, requirement_id, course_id, provider_id, status)
VALUES (
  '<your-plan-id>',
  (SELECT id FROM public.requirement_blocks WHERE slug = 'y1-found'),
  (SELECT id FROM public.edu_courses WHERE code LIKE 'CS%' LIMIT 1),
  'UMPI',
  'selected'
)
ON CONFLICT (plan_id, requirement_id) DO UPDATE
SET course_id = EXCLUDED.course_id, updated_at = now()
RETURNING *;
*/

-- ============================================
-- DIAGNOSTIC QUERIES
-- ============================================

-- Check all options for a block
SELECT 
  ro.id,
  ro.requirement_id,
  ro.option_kind,
  rb.slug as block_slug,
  rb.title as block_title,
  ec.code as course_code,
  ec.title as course_title,
  ro.transfer_eligible
FROM public.requirement_options ro
JOIN public.requirement_blocks rb ON rb.id = ro.requirement_id
LEFT JOIN public.edu_courses ec ON ec.id = ro.option_ref_id
WHERE rb.slug = 'y1-found'
ORDER BY ec.code;

-- Check all transfer rules for a block
SELECT 
  tr.id,
  rb.slug as block_slug,
  ec.code as course_code,
  tr.transfer_state,
  tr.score,
  tr.notes,
  tr.updated_at
FROM public.transfer_rules tr
JOIN public.requirement_blocks rb ON rb.id = tr.block_id
LEFT JOIN public.edu_courses ec ON ec.id = tr.course_id
WHERE rb.slug = 'y1-found'
ORDER BY tr.score DESC;

-- Check data version components
SELECT 
  'blocks' as source,
  COUNT(*) as count,
  MAX(updated_at) as last_updated
FROM public.requirement_blocks

UNION ALL

SELECT 
  'courses' as source,
  COUNT(*) as count,
  MAX(updated_at) as last_updated
FROM public.edu_courses

UNION ALL

SELECT 
  'options' as source,
  COUNT(*) as count,
  MAX(created_at) as last_updated
FROM public.requirement_options

UNION ALL

SELECT 
  'transfer_rules' as source,
  COUNT(*) as count,
  MAX(updated_at) as last_updated
FROM public.transfer_rules;
