-- Back up current roadmap_steps data
CREATE TABLE roadmap_steps_backup AS 
SELECT * FROM roadmap_steps;

-- Add skill_keywords field if it doesn't exist
ALTER TABLE roadmap_steps 
ADD COLUMN IF NOT EXISTS skill_keywords TEXT[] DEFAULT '{}';

-- Populate skill_keywords based on title fuzzy matching
UPDATE roadmap_steps 
SET skill_keywords = CASE
  -- Adobe-related steps
  WHEN LOWER(title) LIKE '%adobe%' THEN 
    ARRAY['Adobe Photoshop', 'Adobe Illustrator', 'Adobe InDesign', 'Graphic Design']
  
  -- UX Design steps (both 'ux' and 'design' must be present)
  WHEN LOWER(title) LIKE '%ux%' AND LOWER(title) LIKE '%design%' THEN 
    ARRAY['UX Design', 'User Research', 'Wireframing', 'Prototyping']
  
  -- Electrical engineering steps
  WHEN LOWER(title) LIKE '%electrical%' THEN 
    ARRAY['Electrical Engineering', 'Circuit Analysis', 'Electrical Safety']
  
  -- Product management steps (both 'product' and 'management' must be present)
  WHEN LOWER(title) LIKE '%product%' AND LOWER(title) LIKE '%management%' THEN 
    ARRAY['Product Management', 'Product Strategy', 'Product Roadmap']
  
  -- Portfolio-related steps
  WHEN LOWER(title) LIKE '%portfolio%' THEN 
    ARRAY['Portfolio Development', 'Project Management']
  
  -- Default case: empty array
  ELSE ARRAY[]::TEXT[]
END;

-- Show update statistics
SELECT 
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE array_length(skill_keywords, 1) > 0) as rows_with_keywords,
  COUNT(*) FILTER (WHERE array_length(skill_keywords, 1) IS NULL OR array_length(skill_keywords, 1) = 0) as rows_without_keywords
FROM roadmap_steps;