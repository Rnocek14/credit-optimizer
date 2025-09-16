-- Restructure levels within existing constraints (levels 1-4)

-- 1. Move architecture to level 4 (track-specific preparation phase)
UPDATE requirement_blocks 
SET level_year = 4, updated_at = now()
WHERE slug = 'architecture';

-- 2. Move machine-learning to level 4 (parallel to architecture for Data Science track)
UPDATE requirement_blocks 
SET level_year = 4, updated_at = now()
WHERE slug = 'machine-learning';

-- 3. Move both capstones to level 4 (alongside architecture/machine-learning)
UPDATE requirement_blocks 
SET level_year = 4, updated_at = now()
WHERE slug IN ('capstone-software-engineering', 'capstone-data-science');

-- 4. Move degree-completion to level 4 (final level - same as capstones)
UPDATE requirement_blocks 
SET level_year = 4, updated_at = now()
WHERE slug = 'degree-completion';

-- 5. Ensure data-analysis stays at level 3 as decision point
UPDATE requirement_blocks 
SET level_year = 3, updated_at = now()
WHERE slug = 'data-analysis';

-- 6. Keep specializations at level 3 as another decision point
UPDATE requirement_blocks 
SET level_year = 3, updated_at = now()
WHERE slug = 'specializations';

-- New level structure within constraints:
-- Level 1: foundations, mathematics, general-education (3 nodes)
-- Level 2: core-i (1 node)
-- Level 3: core-ii, specializations, data-analysis (3 nodes) - decision points
-- Level 4: architecture, machine-learning, capstone-software-engineering, capstone-data-science, degree-completion (5 nodes)