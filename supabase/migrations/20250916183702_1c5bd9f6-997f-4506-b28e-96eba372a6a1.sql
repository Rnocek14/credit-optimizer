-- Restructure levels for better visual flow and reduced edge crossings

-- 1. Move architecture to level 4 (track-specific preparation phase)
UPDATE requirement_blocks 
SET level_year = 4, updated_at = now()
WHERE slug = 'architecture';

-- 2. Move machine-learning to level 4 (parallel to architecture for Data Science track)
UPDATE requirement_blocks 
SET level_year = 4, updated_at = now()
WHERE slug = 'machine-learning';

-- 3. Move both capstones to level 5 (final preparation before degree)
UPDATE requirement_blocks 
SET level_year = 5, updated_at = now()
WHERE slug IN ('capstone-software-engineering', 'capstone-data-science');

-- 4. Move degree-completion to level 6 (final level)
UPDATE requirement_blocks 
SET level_year = 6, updated_at = now()
WHERE slug = 'degree-completion';

-- 5. Ensure data-analysis stays at level 3 as decision point
UPDATE requirement_blocks 
SET level_year = 3, updated_at = now()
WHERE slug = 'data-analysis';

-- 6. Keep specializations at level 3 as another decision point
UPDATE requirement_blocks 
SET level_year = 3, updated_at = now()
WHERE slug = 'specializations';

-- Verify the new level structure:
-- Level 1: foundations, mathematics, general-education (3 nodes)
-- Level 2: core-i (1 node)
-- Level 3: core-ii, specializations, data-analysis (3 nodes) - decision points
-- Level 4: architecture, machine-learning (2 nodes) - track-specific preparation  
-- Level 5: capstone-software-engineering, capstone-data-science (2 nodes)
-- Level 6: degree-completion (1 node)