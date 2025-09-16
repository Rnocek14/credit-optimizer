-- Fix the critical missing prerequisite relationships and restructure levels
-- First, create the missing prerequisite relationships in prereq_to_block table

-- Level 1 → Level 2: All foundation blocks to mathematics
INSERT INTO public.prereq_to_block (prereq_block_id, target_block_id)
SELECT 
  foundation_blocks.id as prereq_block_id,
  math_block.id as target_block_id
FROM 
  (SELECT id FROM public.blocks WHERE area = 'foundation' AND level_year = 1) foundation_blocks
CROSS JOIN 
  (SELECT id FROM public.blocks WHERE slug = 'mathematics' AND level_year = 2) math_block
ON CONFLICT (prereq_block_id, target_block_id) DO NOTHING;

-- Level 2 → Level 3: Mathematics to all level 3 blocks
INSERT INTO public.prereq_to_block (prereq_block_id, target_block_id)
SELECT 
  math_block.id as prereq_block_id,
  level3_blocks.id as target_block_id
FROM 
  (SELECT id FROM public.blocks WHERE slug = 'mathematics' AND level_year = 2) math_block
CROSS JOIN 
  (SELECT id FROM public.blocks WHERE level_year = 3) level3_blocks
ON CONFLICT (prereq_block_id, target_block_id) DO NOTHING;

-- Level 3 → Level 4: Track-specific connections
-- Data Analysis + Specializations → Data Science Capstone
INSERT INTO public.prereq_to_block (prereq_block_id, target_block_id)
SELECT 
  prereq.id as prereq_block_id,
  capstone.id as target_block_id
FROM 
  (SELECT id FROM public.blocks WHERE slug IN ('data-analysis', 'specializations')) prereq
CROSS JOIN 
  (SELECT id FROM public.blocks WHERE slug = 'data-science-capstone') capstone
ON CONFLICT (prereq_block_id, target_block_id) DO NOTHING;

-- Data Analysis + Specializations → Software Engineering Capstone  
INSERT INTO public.prereq_to_block (prereq_block_id, target_block_id)
SELECT 
  prereq.id as prereq_block_id,
  capstone.id as target_block_id
FROM 
  (SELECT id FROM public.blocks WHERE slug IN ('data-analysis', 'specializations')) prereq
CROSS JOIN 
  (SELECT id FROM public.blocks WHERE slug = 'software-engineering-capstone') capstone
ON CONFLICT (prereq_block_id, target_block_id) DO NOTHING;

-- Move degree-completion to Level 5 and create connections from capstones
UPDATE public.blocks 
SET level_year = 5, updated_at = now()
WHERE slug = 'degree-completion';

-- Level 4 → Level 5: Both capstones to degree completion
INSERT INTO public.prereq_to_block (prereq_block_id, target_block_id)
SELECT 
  capstone.id as prereq_block_id,
  degree.id as target_block_id
FROM 
  (SELECT id FROM public.blocks WHERE slug IN ('data-science-capstone', 'software-engineering-capstone')) capstone
CROSS JOIN 
  (SELECT id FROM public.blocks WHERE slug = 'degree-completion') degree
ON CONFLICT (prereq_block_id, target_block_id) DO NOTHING;

-- Add some additional logical prerequisites for better flow
-- General Education should also connect to level 3
INSERT INTO public.prereq_to_block (prereq_block_id, target_block_id)
SELECT 
  gen_ed.id as prereq_block_id,
  level3_blocks.id as target_block_id
FROM 
  (SELECT id FROM public.blocks WHERE slug = 'general-education') gen_ed
CROSS JOIN 
  (SELECT id FROM public.blocks WHERE slug IN ('data-analysis', 'specializations')) level3_blocks
ON CONFLICT (prereq_block_id, target_block_id) DO NOTHING;