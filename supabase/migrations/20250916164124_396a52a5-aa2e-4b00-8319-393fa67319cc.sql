-- Phase A: EduTree Cleanup - Create track-specific capstones and remove unwanted tracks

-- Create track-specific capstone blocks
INSERT INTO requirement_blocks (title, slug, rule_type, level_year, area)
SELECT 'Software Engineering Capstone', 'capstone-software-engineering', 'ALL', 4, 'capstone'
WHERE NOT EXISTS (
    SELECT 1 FROM requirement_blocks WHERE slug = 'capstone-software-engineering'
);

INSERT INTO requirement_blocks (title, slug, rule_type, level_year, area)
SELECT 'Data Science Capstone', 'capstone-data-science', 'ALL', 4, 'capstone'
WHERE NOT EXISTS (
    SELECT 1 FROM requirement_blocks WHERE slug = 'capstone-data-science'
);

-- Create gates for the new capstone blocks
INSERT INTO block_gates (block_id)
SELECT rb.id FROM requirement_blocks rb
WHERE rb.slug IN ('capstone-software-engineering', 'capstone-data-science')
AND NOT EXISTS (
    SELECT 1 FROM block_gates bg WHERE bg.block_id = rb.id
);

-- Connect track-specific predecessors to track-specific capstones
-- Software Engineering: architecture -> capstone-software-engineering
INSERT INTO prereq_to_block (source_gate_id, target_block_id)
SELECT bg_source.id, rb_target.id
FROM block_gates bg_source 
JOIN requirement_blocks rb_source ON rb_source.id = bg_source.block_id
JOIN requirement_blocks rb_target ON rb_target.slug = 'capstone-software-engineering'
WHERE rb_source.slug = 'architecture'
AND NOT EXISTS (
    SELECT 1 FROM prereq_to_block ptb 
    WHERE ptb.source_gate_id = bg_source.id 
    AND ptb.target_block_id = rb_target.id
);

-- Data Science: machine-learning -> capstone-data-science
INSERT INTO prereq_to_block (source_gate_id, target_block_id)
SELECT bg_source.id, rb_target.id
FROM block_gates bg_source 
JOIN requirement_blocks rb_source ON rb_source.id = bg_source.block_id
JOIN requirement_blocks rb_target ON rb_target.slug = 'capstone-data-science'
WHERE rb_source.slug = 'machine-learning'
AND NOT EXISTS (
    SELECT 1 FROM prereq_to_block ptb 
    WHERE ptb.source_gate_id = bg_source.id 
    AND ptb.target_block_id = rb_target.id
);

-- Connect track-specific capstones to their degree completion blocks
INSERT INTO prereq_to_block (source_gate_id, target_block_id)
SELECT bg_source.id, rb_target.id
FROM block_gates bg_source 
JOIN requirement_blocks rb_source ON rb_source.id = bg_source.block_id
JOIN requirement_blocks rb_target ON rb_target.slug = 'degree-completion-software-engineering'
WHERE rb_source.slug = 'capstone-software-engineering'
AND NOT EXISTS (
    SELECT 1 FROM prereq_to_block ptb 
    WHERE ptb.source_gate_id = bg_source.id 
    AND ptb.target_block_id = rb_target.id
);

INSERT INTO prereq_to_block (source_gate_id, target_block_id)
SELECT bg_source.id, rb_target.id
FROM block_gates bg_source 
JOIN requirement_blocks rb_source ON rb_source.id = bg_source.block_id
JOIN requirement_blocks rb_target ON rb_target.slug = 'degree-completion-data-science'
WHERE rb_source.slug = 'capstone-data-science'
AND NOT EXISTS (
    SELECT 1 FROM prereq_to_block ptb 
    WHERE ptb.source_gate_id = bg_source.id 
    AND ptb.target_block_id = rb_target.id
);

-- Remove connections from the old shared capstone
DELETE FROM prereq_to_block 
WHERE target_block_id IN (
    SELECT id FROM requirement_blocks 
    WHERE slug IN ('degree-completion-software-engineering', 'degree-completion-data-science')
)
AND source_gate_id IN (
    SELECT bg.id FROM block_gates bg
    JOIN requirement_blocks rb ON rb.id = bg.block_id
    WHERE rb.slug = 'capstone'
);

-- Clean up unwanted degree completion blocks and their connections
DELETE FROM prereq_to_block 
WHERE target_block_id IN (
    SELECT id FROM requirement_blocks 
    WHERE slug IN ('degree-completion-cybersecurity', 'degree-completion-mobile')
);

DELETE FROM block_gates
WHERE block_id IN (
    SELECT id FROM requirement_blocks
    WHERE slug IN ('degree-completion-cybersecurity', 'degree-completion-mobile', 'capstone')
);

DELETE FROM requirement_blocks
WHERE slug IN ('degree-completion-cybersecurity', 'degree-completion-mobile');

-- Update level_year for proper academic progression (Y1-Y4)
UPDATE requirement_blocks SET level_year = 1 
WHERE slug IN ('foundations', 'mathematics', 'general-education') AND level_year != 1;

UPDATE requirement_blocks SET level_year = 2 
WHERE slug IN ('core-i') AND level_year != 2;

UPDATE requirement_blocks SET level_year = 3 
WHERE slug IN ('core-ii', 'data-analysis', 'machine-learning', 'specializations', 'architecture') AND level_year != 3;

UPDATE requirement_blocks SET level_year = 4 
WHERE slug IN ('capstone-software-engineering', 'capstone-data-science', 'degree-completion-software-engineering', 'degree-completion-data-science') AND level_year != 4;