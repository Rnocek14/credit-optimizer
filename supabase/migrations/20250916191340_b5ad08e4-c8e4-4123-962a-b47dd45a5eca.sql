-- Step 1: Fix Level Structure - Allow level_year 1-5 and move degree-completion to Level 5

-- Drop the existing check constraint that limits level_year to 1-4
ALTER TABLE requirement_blocks DROP CONSTRAINT IF EXISTS requirement_blocks_level_year_check;

-- Add new check constraint to allow level_year 1-5
ALTER TABLE requirement_blocks ADD CONSTRAINT requirement_blocks_level_year_check 
CHECK (level_year >= 1 AND level_year <= 5);

-- Move degree-completion from level 4 to level 5 to create proper terminal node
UPDATE requirement_blocks 
SET level_year = 5 
WHERE slug = 'degree-completion';