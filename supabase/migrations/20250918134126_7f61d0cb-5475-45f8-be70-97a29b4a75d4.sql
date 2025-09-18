-- Add new columns for EduTree V2 Clean Slate
-- Support manual positioning, virtual nodes, and track branching

ALTER TABLE requirement_blocks 
ADD COLUMN position_x INTEGER,
ADD COLUMN position_y INTEGER,  
ADD COLUMN is_virtual BOOLEAN DEFAULT FALSE,
ADD COLUMN track_id TEXT,
ADD COLUMN program_id TEXT;