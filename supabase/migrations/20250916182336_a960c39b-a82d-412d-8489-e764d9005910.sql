-- Fix node connections and path formatting

-- 1. Update Architecture level from 3 to 4 to sequence properly after Specializations
UPDATE requirement_blocks 
SET level_year = 4, updated_at = now()
WHERE slug = 'architecture';

-- 2. Add missing Core-II → Specializations connection
INSERT INTO prereq_to_block (from_id, to_id, created_at)
SELECT 
  (SELECT id FROM requirement_blocks WHERE slug = 'core-ii'),
  (SELECT id FROM requirement_blocks WHERE slug = 'specializations'),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM prereq_to_block 
  WHERE from_id = (SELECT id FROM requirement_blocks WHERE slug = 'core-ii')
    AND to_id = (SELECT id FROM requirement_blocks WHERE slug = 'specializations')
);

-- 3. Remove direct Core-II → Architecture connection (should go through Specializations)
DELETE FROM prereq_to_block 
WHERE from_id = (SELECT id FROM requirement_blocks WHERE slug = 'core-ii')
  AND to_id = (SELECT id FROM requirement_blocks WHERE slug = 'architecture');

-- 4. Add Specializations → Architecture connection
INSERT INTO prereq_to_block (from_id, to_id, created_at)
SELECT 
  (SELECT id FROM requirement_blocks WHERE slug = 'specializations'),
  (SELECT id FROM requirement_blocks WHERE slug = 'architecture'),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM prereq_to_block 
  WHERE from_id = (SELECT id FROM requirement_blocks WHERE slug = 'specializations')
    AND to_id = (SELECT id FROM requirement_blocks WHERE slug = 'architecture')
);

-- 5. Remove direct Machine Learning → Degree-Completion-Data-Science connection (should go through capstone only)
DELETE FROM prereq_to_block 
WHERE from_id = (SELECT id FROM requirement_blocks WHERE slug = 'machine-learning')
  AND to_id = (SELECT id FROM requirement_blocks WHERE slug = 'degree-completion-data-science');

-- 6. Ensure proper capstone connections exist
INSERT INTO prereq_to_block (from_id, to_id, created_at)
SELECT 
  (SELECT id FROM requirement_blocks WHERE slug = 'capstone-software-engineering'),
  (SELECT id FROM requirement_blocks WHERE slug = 'degree-completion-software-engineering'),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM prereq_to_block 
  WHERE from_id = (SELECT id FROM requirement_blocks WHERE slug = 'capstone-software-engineering')
    AND to_id = (SELECT id FROM requirement_blocks WHERE slug = 'degree-completion-software-engineering')
);

INSERT INTO prereq_to_block (from_id, to_id, created_at)
SELECT 
  (SELECT id FROM requirement_blocks WHERE slug = 'capstone-data-science'),
  (SELECT id FROM requirement_blocks WHERE slug = 'degree-completion-data-science'),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM prereq_to_block 
  WHERE from_id = (SELECT id FROM requirement_blocks WHERE slug = 'capstone-data-science')
    AND to_id = (SELECT id FROM requirement_blocks WHERE slug = 'degree-completion-data-science')
);

-- 7. Clean up any duplicate edges that might exist
WITH duplicate_edges AS (
  SELECT from_id, to_id, MIN(created_at) as keep_date
  FROM prereq_to_block
  GROUP BY from_id, to_id
  HAVING COUNT(*) > 1
)
DELETE FROM prereq_to_block 
WHERE (from_id, to_id, created_at) IN (
  SELECT ptb.from_id, ptb.to_id, ptb.created_at
  FROM prereq_to_block ptb
  JOIN duplicate_edges de ON ptb.from_id = de.from_id AND ptb.to_id = de.to_id
  WHERE ptb.created_at > de.keep_date
);