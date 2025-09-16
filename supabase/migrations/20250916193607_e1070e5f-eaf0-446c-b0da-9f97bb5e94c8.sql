-- PhaseA Implementation: Add required columns and configure blocks
-- Step 1: Add PhaseA columns to requirement_blocks
ALTER TABLE requirement_blocks ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT false;
ALTER TABLE requirement_blocks ADD COLUMN IF NOT EXISTS track_id TEXT;

-- Add is_active to career_tracks for future track management
ALTER TABLE career_tracks ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS blocks_hidden_idx ON requirement_blocks(hidden);
CREATE INDEX IF NOT EXISTS blocks_track_id_idx ON requirement_blocks(track_id);
CREATE INDEX IF NOT EXISTS tracks_is_active_idx ON career_tracks(is_active);

-- Step 2: Tag blocks with track IDs
UPDATE requirement_blocks SET track_id = 'software-engineering' 
WHERE slug IN ('specializations', 'architecture', 'capstone-software-engineering');

UPDATE requirement_blocks SET track_id = 'data-science'  
WHERE slug IN ('data-analysis', 'machine-learning', 'capstone-data-science');

-- Step 3: Optimize Y1-Y4 distribution for better visual layout
UPDATE requirement_blocks SET level_year = 1 WHERE slug IN ('foundations', 'mathematics', 'general-education');
UPDATE requirement_blocks SET level_year = 2 WHERE slug IN ('core-i', 'core-ii'); 
UPDATE requirement_blocks SET level_year = 3 WHERE slug IN ('specializations', 'data-analysis');
UPDATE requirement_blocks SET level_year = 4 WHERE slug IN ('architecture', 'machine-learning', 'capstone-software-engineering', 'capstone-data-science');

-- Step 4: Hide degree-completion node for PhaseA (keep for rollback)
UPDATE requirement_blocks SET hidden = true WHERE slug = 'degree-completion';