-- Create the degree completion block using level_year 4 (same as capstone/architecture)
-- but distinguish it with the 'degree' area
INSERT INTO requirement_blocks (
  id,
  title,
  area,
  rule_type,
  level_year,
  credits_needed
) VALUES (
  gen_random_uuid(),
  'B.S. Software Engineering',
  'degree',
  'ALL',
  4,
  0
);

-- Create a gate for the degree block
INSERT INTO block_gates (id, block_id)
SELECT gen_random_uuid(), rb.id
FROM requirement_blocks rb
WHERE rb.title = 'B.S. Software Engineering' AND rb.area = 'degree';

-- Add prerequisites: degree requires both Architecture and Capstone to be complete
INSERT INTO prereq_to_block (id, source_gate_id, target_block_id)
SELECT 
  gen_random_uuid(),
  bg_arch.id,
  rb_degree.id
FROM requirement_blocks rb_degree
CROSS JOIN requirement_blocks rb_arch
LEFT JOIN block_gates bg_arch ON bg_arch.block_id = rb_arch.id
WHERE rb_degree.title = 'B.S. Software Engineering' 
  AND rb_degree.area = 'degree'
  AND rb_arch.title ILIKE '%architecture%'
  AND rb_arch.level_year = 4;

INSERT INTO prereq_to_block (id, source_gate_id, target_block_id)
SELECT 
  gen_random_uuid(),
  bg_cap.id,
  rb_degree.id
FROM requirement_blocks rb_degree
CROSS JOIN requirement_blocks rb_cap
LEFT JOIN block_gates bg_cap ON bg_cap.block_id = rb_cap.id
WHERE rb_degree.title = 'B.S. Software Engineering' 
  AND rb_degree.area = 'degree'
  AND rb_cap.title ILIKE '%capstone%'
  AND rb_cap.level_year = 4;