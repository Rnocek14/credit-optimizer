-- Add remaining columns for EduTree V2 Clean Slate
-- Support manual positioning, virtual nodes, and program branching

ALTER TABLE requirement_blocks 
ADD COLUMN position_x INTEGER,
ADD COLUMN position_y INTEGER,  
ADD COLUMN is_virtual BOOLEAN DEFAULT FALSE,
ADD COLUMN program_id TEXT;