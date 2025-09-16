-- Fix the critical missing prerequisite relationships and restructure levels
-- This uses the correct gate-to-block structure

-- First, move degree-completion to Level 5 to create proper terminal structure
UPDATE public.requirement_blocks 
SET level_year = 5, updated_at = now()
WHERE slug = 'degree-completion';

-- Clear any existing prerequisite relationships to start fresh
DELETE FROM public.prereq_to_block;

-- Level 1 → Level 2: All foundation blocks (via their gates) to Core I
INSERT INTO public.prereq_to_block (source_gate_id, target_block_id)
SELECT 
  bg.id as source_gate_id,
  core1.id as target_block_id
FROM 
  public.block_gates bg
  JOIN public.requirement_blocks rb ON bg.block_id = rb.id
  CROSS JOIN (SELECT id FROM public.requirement_blocks WHERE slug = 'core-i') core1
WHERE rb.level_year = 1;

-- Level 2 → Level 3: Core I to all level 3 blocks
INSERT INTO public.prereq_to_block (source_gate_id, target_block_id)
SELECT 
  bg.id as source_gate_id,
  level3.id as target_block_id
FROM 
  public.block_gates bg
  JOIN public.requirement_blocks rb ON bg.block_id = rb.id
  CROSS JOIN (SELECT id FROM public.requirement_blocks WHERE level_year = 3) level3
WHERE rb.slug = 'core-i';

-- Level 3 → Level 4: Track-specific connections
-- Core II + Data Analysis → Data Science track (Machine Learning + Data Science Capstone)
INSERT INTO public.prereq_to_block (source_gate_id, target_block_id)
SELECT 
  bg.id as source_gate_id,
  ds_track.id as target_block_id
FROM 
  public.block_gates bg
  JOIN public.requirement_blocks rb ON bg.block_id = rb.id
  CROSS JOIN (
    SELECT id FROM public.requirement_blocks 
    WHERE slug IN ('machine-learning', 'capstone-data-science')
  ) ds_track
WHERE rb.slug IN ('core-ii', 'data-analysis');

-- Core II + Specializations → Software Engineering track (Architecture + Software Engineering Capstone)
INSERT INTO public.prereq_to_block (source_gate_id, target_block_id)
SELECT 
  bg.id as source_gate_id,
  se_track.id as target_block_id
FROM 
  public.block_gates bg
  JOIN public.requirement_blocks rb ON bg.block_id = rb.id
  CROSS JOIN (
    SELECT id FROM public.requirement_blocks 
    WHERE slug IN ('architecture', 'capstone-software-engineering')
  ) se_track
WHERE rb.slug IN ('core-ii', 'specializations');

-- Level 4 → Level 5: Both capstones to degree completion
INSERT INTO public.prereq_to_block (source_gate_id, target_block_id)
SELECT 
  bg.id as source_gate_id,
  degree.id as target_block_id
FROM 
  public.block_gates bg
  JOIN public.requirement_blocks rb ON bg.block_id = rb.id
  CROSS JOIN (SELECT id FROM public.requirement_blocks WHERE slug = 'degree-completion') degree
WHERE rb.slug IN ('capstone-data-science', 'capstone-software-engineering');