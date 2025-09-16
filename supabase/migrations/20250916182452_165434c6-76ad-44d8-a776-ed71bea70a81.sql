-- Fix node connections and path formatting with correct column names

-- 1. Update Architecture level from 3 to 4 to sequence properly after Specializations
UPDATE requirement_blocks 
SET level_year = 4, updated_at = now()
WHERE slug = 'architecture';

-- 2. Remove direct Core-II → Architecture connection (should go through Specializations)
DELETE FROM prereq_to_block 
WHERE source_gate_id = (SELECT bg.id FROM block_gates bg JOIN requirement_blocks rb ON rb.id = bg.block_id WHERE rb.slug = 'core-ii')
  AND target_block_id = (SELECT id FROM requirement_blocks WHERE slug = 'architecture');

-- 3. Add Specializations → Architecture connection
INSERT INTO prereq_to_block (source_gate_id, target_block_id, created_at)
SELECT 
  (SELECT bg.id FROM block_gates bg JOIN requirement_blocks rb ON rb.id = bg.block_id WHERE rb.slug = 'specializations'),
  (SELECT id FROM requirement_blocks WHERE slug = 'architecture'),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM prereq_to_block 
  WHERE source_gate_id = (SELECT bg.id FROM block_gates bg JOIN requirement_blocks rb ON rb.id = bg.block_id WHERE rb.slug = 'specializations')
    AND target_block_id = (SELECT id FROM requirement_blocks WHERE slug = 'architecture')
);

-- 4. Remove direct Machine Learning → Degree-Completion-Data-Science connection (should go through capstone only)
DELETE FROM prereq_to_block 
WHERE source_gate_id = (SELECT bg.id FROM block_gates bg JOIN requirement_blocks rb ON rb.id = bg.block_id WHERE rb.slug = 'machine-learning')
  AND target_block_id = (SELECT id FROM requirement_blocks WHERE slug = 'degree-completion-data-science');

-- 5. Remove incorrect Architecture → Capstone and Degree-Completion connections (Architecture should be a prerequisite, not a connector)
DELETE FROM prereq_to_block 
WHERE source_gate_id = (SELECT bg.id FROM block_gates bg JOIN requirement_blocks rb ON rb.id = bg.block_id WHERE rb.slug = 'architecture')
  AND target_block_id IN (
    SELECT id FROM requirement_blocks WHERE slug IN ('capstone-software-engineering', 'degree-completion-software-engineering')
  );

-- 6. Add Architecture → Capstone-Software-Engineering connection (correct direction)
INSERT INTO prereq_to_block (source_gate_id, target_block_id, created_at)
SELECT 
  (SELECT bg.id FROM block_gates bg JOIN requirement_blocks rb ON rb.id = bg.block_id WHERE rb.slug = 'architecture'),
  (SELECT id FROM requirement_blocks WHERE slug = 'capstone-software-engineering'),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM prereq_to_block 
  WHERE source_gate_id = (SELECT bg.id FROM block_gates bg JOIN requirement_blocks rb ON rb.id = bg.block_id WHERE rb.slug = 'architecture')
    AND target_block_id = (SELECT id FROM requirement_blocks WHERE slug = 'capstone-software-engineering')
);

-- 7. Clean up any duplicate edges that might exist
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