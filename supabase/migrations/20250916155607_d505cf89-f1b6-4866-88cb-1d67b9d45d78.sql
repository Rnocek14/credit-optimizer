-- Create the software engineering degree completion block if it doesn't exist
INSERT INTO requirement_blocks (title, slug, rule_type, level_year, area) 
VALUES ('B.S. Software Engineering', 'degree-completion-software-engineering', 'ALL', 4, 'degree')
ON CONFLICT (slug) DO NOTHING;

-- Create a block gate for it
INSERT INTO block_gates (block_id)
SELECT id FROM requirement_blocks WHERE slug = 'degree-completion-software-engineering'
AND NOT EXISTS (SELECT 1 FROM block_gates WHERE block_id = requirement_blocks.id);

-- Create the prerequisite edge from capstone to degree completion for software engineering
INSERT INTO prereq_to_block (source_gate_id, target_block_id)
SELECT bg_source.id, rb_target.id
FROM block_gates bg_source 
JOIN requirement_blocks rb_source ON rb_source.id = bg_source.block_id
CROSS JOIN requirement_blocks rb_target
WHERE rb_source.slug = 'capstone' AND rb_target.slug = 'degree-completion-software-engineering'
AND NOT EXISTS (
  SELECT 1 FROM prereq_to_block p2b 
  WHERE p2b.source_gate_id = bg_source.id AND p2b.target_block_id = rb_target.id
);