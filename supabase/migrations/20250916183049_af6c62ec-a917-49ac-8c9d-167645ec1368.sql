-- Comprehensive fix for EduTree node structure and connections

-- 1. Create a single unified degree-completion node (merge the two existing ones)
UPDATE requirement_blocks 
SET 
  title = 'Degree Completion',
  slug = 'degree-completion',
  updated_at = now()
WHERE slug = 'degree-completion-software-engineering';

-- 2. Update any connections pointing to degree-completion-data-science to point to the unified one
UPDATE prereq_to_block 
SET target_block_id = (SELECT id FROM requirement_blocks WHERE slug = 'degree-completion')
WHERE target_block_id = (SELECT id FROM requirement_blocks WHERE slug = 'degree-completion-data-science');

-- 3. Remove the duplicate degree-completion-data-science node
DELETE FROM block_gates WHERE block_id = (SELECT id FROM requirement_blocks WHERE slug = 'degree-completion-data-science');
DELETE FROM block_members WHERE block_id = (SELECT id FROM requirement_blocks WHERE slug = 'degree-completion-data-science');
DELETE FROM requirement_blocks WHERE slug = 'degree-completion-data-science';

-- 4. Add core-ii as prerequisite to data-analysis for Data Science track consistency
INSERT INTO prereq_to_block (source_gate_id, target_block_id, created_at)
SELECT 
  (SELECT bg.id FROM block_gates bg JOIN requirement_blocks rb ON rb.id = bg.block_id WHERE rb.slug = 'core-ii'),
  (SELECT id FROM requirement_blocks WHERE slug = 'data-analysis'),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM prereq_to_block 
  WHERE source_gate_id = (SELECT bg.id FROM block_gates bg JOIN requirement_blocks rb ON rb.id = bg.block_id WHERE rb.slug = 'core-ii')
    AND target_block_id = (SELECT id FROM requirement_blocks WHERE slug = 'data-analysis')
);

-- 5. Move Architecture to level 3 (same as specializations) for better flow
UPDATE requirement_blocks 
SET level_year = 3, updated_at = now()
WHERE slug = 'architecture';

-- 6. Remove architecture from pointing to old degree completion nodes and ensure it only goes to capstone
DELETE FROM prereq_to_block 
WHERE source_gate_id = (SELECT bg.id FROM block_gates bg JOIN requirement_blocks rb ON rb.id = bg.block_id WHERE rb.slug = 'architecture')
  AND target_block_id IN (
    SELECT id FROM requirement_blocks WHERE slug LIKE 'degree-completion%'
  );

-- 7. Ensure both capstones point to the unified degree-completion
INSERT INTO prereq_to_block (source_gate_id, target_block_id, created_at)
SELECT 
  (SELECT bg.id FROM block_gates bg JOIN requirement_blocks rb ON rb.id = bg.block_id WHERE rb.slug = 'capstone-software-engineering'),
  (SELECT id FROM requirement_blocks WHERE slug = 'degree-completion'),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM prereq_to_block 
  WHERE source_gate_id = (SELECT bg.id FROM block_gates bg JOIN requirement_blocks rb ON rb.id = bg.block_id WHERE rb.slug = 'capstone-software-engineering')
    AND target_block_id = (SELECT id FROM requirement_blocks WHERE slug = 'degree-completion')
);

INSERT INTO prereq_to_block (source_gate_id, target_block_id, created_at)
SELECT 
  (SELECT bg.id FROM block_gates bg JOIN requirement_blocks rb ON rb.id = bg.block_id WHERE rb.slug = 'capstone-data-science'),
  (SELECT id FROM requirement_blocks WHERE slug = 'degree-completion'),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM prereq_to_block 
  WHERE source_gate_id = (SELECT bg.id FROM block_gates bg JOIN requirement_blocks rb ON rb.id = bg.block_id WHERE rb.slug = 'capstone-data-science')
    AND target_block_id = (SELECT id FROM requirement_blocks WHERE slug = 'degree-completion')
);

-- 8. Clean up any remaining duplicate connections
WITH duplicate_edges AS (
  SELECT source_gate_id, target_block_id, MIN(created_at) as keep_date
  FROM prereq_to_block
  GROUP BY source_gate_id, target_block_id
  HAVING COUNT(*) > 1
)
DELETE FROM prereq_to_block 
WHERE (source_gate_id, target_block_id, created_at) IN (
  SELECT ptb.source_gate_id, ptb.target_block_id, ptb.created_at
  FROM prereq_to_block ptb
  JOIN duplicate_edges de ON ptb.source_gate_id = de.source_gate_id AND ptb.target_block_id = de.target_block_id
  WHERE ptb.created_at > de.keep_date
);