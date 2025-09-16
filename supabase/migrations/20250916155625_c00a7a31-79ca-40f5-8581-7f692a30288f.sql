-- Fix the software engineering degree completion slug if it doesn't exist
INSERT INTO requirement_blocks (title, slug, rule_type, level_year, area)
SELECT 'B.S. Software Engineering', 'degree-completion-software-engineering', 'ALL', 4, 'degree'
WHERE NOT EXISTS (
    SELECT 1 FROM requirement_blocks WHERE slug = 'degree-completion-software-engineering'
);

-- Create gate for software engineering degree if it doesn't exist
INSERT INTO block_gates (block_id)
SELECT rb.id FROM requirement_blocks rb
WHERE rb.slug = 'degree-completion-software-engineering'
AND NOT EXISTS (
    SELECT 1 FROM block_gates bg WHERE bg.block_id = rb.id
);

-- Create the final edges to connect capstone/architecture to software engineering degree
INSERT INTO prereq_to_block (source_gate_id, target_block_id)
SELECT bg_source.id, rb_target.id
FROM block_gates bg_source 
JOIN requirement_blocks rb_source ON rb_source.id = bg_source.block_id
JOIN requirement_blocks rb_target ON rb_target.slug = 'degree-completion-software-engineering'
WHERE rb_source.slug IN ('capstone', 'architecture')
AND NOT EXISTS (
    SELECT 1 FROM prereq_to_block ptb 
    WHERE ptb.source_gate_id = bg_source.id 
    AND ptb.target_block_id = rb_target.id
);