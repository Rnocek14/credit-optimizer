-- Fix the equivalency unique constraint to use requirement_area instead of course_code

-- 1. Drop the constraint (not the index)
ALTER TABLE cross_institution_equivalencies 
DROP CONSTRAINT equivalencies_unique;

-- 2. Make institutional_course_code nullable
ALTER TABLE cross_institution_equivalencies 
ALTER COLUMN institutional_course_code DROP NOT NULL;

-- 3. Add the correct unique constraint on requirement_area
ALTER TABLE cross_institution_equivalencies
ADD CONSTRAINT cie_alt_inst_reqarea_unique 
UNIQUE (alt_credit_id, institution_id, requirement_area);