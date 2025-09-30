
-- Create the 11 missing requirement blocks
INSERT INTO requirement_blocks (slug, title, rule_type, level_year, area) VALUES
  ('cs-elec', 'CS Electives', 'K_OF_N', 2, 'electives'),
  ('it-elec', 'IT Electives', 'K_OF_N', 2, 'electives'),
  ('se-elec', 'SE Electives', 'K_OF_N', 3, 'electives'),
  ('ds-elec', 'DS Electives', 'K_OF_N', 3, 'electives'),
  ('se-cap', 'SE Capstone', 'ALL', 4, 'capstone'),
  ('ds-cap', 'DS Capstone', 'ALL', 4, 'capstone'),
  ('it-cap', 'IT Capstone', 'ALL', 4, 'capstone'),
  ('bsn-found', 'BSN Foundations', 'ALL', 1, 'foundation'),
  ('bsn-core', 'BSN Core', 'ALL', 2, 'core'),
  ('bsn-clinical', 'BSN Clinical', 'ALL', 3, 'clinical'),
  ('bsn-capstone', 'BSN Capstone', 'ALL', 4, 'capstone')
ON CONFLICT (slug) DO NOTHING;

-- Seed 5 random courses into each new block
WITH new_blocks AS (
  SELECT id, slug FROM requirement_blocks 
  WHERE slug IN ('cs-elec', 'it-elec', 'se-elec', 'ds-elec', 'se-cap', 'ds-cap', 'it-cap', 
                 'bsn-found', 'bsn-core', 'bsn-clinical', 'bsn-capstone')
),
course_selection AS (
  SELECT 
    nb.id as block_id,
    c.id as course_id,
    row_number() OVER (PARTITION BY nb.id ORDER BY random()) as rn
  FROM new_blocks nb
  CROSS JOIN edu_courses c
)
INSERT INTO block_members (block_id, course_id)
SELECT block_id, course_id 
FROM course_selection 
WHERE rn <= 5
ON CONFLICT DO NOTHING;

-- Refresh the counts to include new blocks
SELECT refresh_requirement_option_counts();
