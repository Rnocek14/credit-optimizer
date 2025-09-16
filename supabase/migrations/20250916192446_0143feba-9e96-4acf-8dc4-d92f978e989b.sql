-- Fix Architecture Prerequisite Flow
-- Remove incorrect direct prerequisites and establish proper sequential flow

-- First, get the gate IDs we need
DO $$
DECLARE
    specializations_gate_id UUID;
    architecture_gate_id UUID;
    core_ii_gate_id UUID;
    data_analysis_gate_id UUID;
    machine_learning_gate_id UUID;
    capstone_se_block_id UUID;
    capstone_ds_block_id UUID;
BEGIN
    -- Get gate IDs for source blocks
    SELECT bg.id INTO specializations_gate_id
    FROM block_gates bg
    JOIN requirement_blocks rb ON rb.id = bg.block_id
    WHERE rb.slug = 'specializations';
    
    SELECT bg.id INTO architecture_gate_id
    FROM block_gates bg
    JOIN requirement_blocks rb ON rb.id = bg.block_id
    WHERE rb.slug = 'architecture';
    
    SELECT bg.id INTO core_ii_gate_id
    FROM block_gates bg
    JOIN requirement_blocks rb ON rb.id = bg.block_id
    WHERE rb.slug = 'core-ii';
    
    SELECT bg.id INTO data_analysis_gate_id
    FROM block_gates bg
    JOIN requirement_blocks rb ON rb.id = bg.block_id
    WHERE rb.slug = 'data-analysis';
    
    SELECT bg.id INTO machine_learning_gate_id
    FROM block_gates bg
    JOIN requirement_blocks rb ON rb.id = bg.block_id
    WHERE rb.slug = 'machine-learning';
    
    -- Get target block IDs
    SELECT rb.id INTO capstone_se_block_id
    FROM requirement_blocks rb
    WHERE rb.slug = 'capstone-software-engineering';
    
    SELECT rb.id INTO capstone_ds_block_id
    FROM requirement_blocks rb
    WHERE rb.slug = 'capstone-data-science';
    
    -- Remove incorrect prerequisites for Software Engineering Capstone
    DELETE FROM prereq_to_block 
    WHERE target_block_id = capstone_se_block_id 
    AND source_gate_id IN (specializations_gate_id, core_ii_gate_id);
    
    -- Remove incorrect prerequisites for Data Science Capstone  
    DELETE FROM prereq_to_block 
    WHERE target_block_id = capstone_ds_block_id 
    AND source_gate_id IN (core_ii_gate_id, data_analysis_gate_id);
    
    -- Add correct prerequisite: architecture → capstone-software-engineering
    INSERT INTO prereq_to_block (source_gate_id, target_block_id)
    VALUES (architecture_gate_id, capstone_se_block_id);
    
    -- Add correct prerequisite: machine-learning → capstone-data-science
    INSERT INTO prereq_to_block (source_gate_id, target_block_id)  
    VALUES (machine_learning_gate_id, capstone_ds_block_id);
    
END $$;