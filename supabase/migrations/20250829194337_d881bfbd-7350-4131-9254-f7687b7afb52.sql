-- Step 1: Drop existing constraint to allow updates
ALTER TABLE alternative_courses DROP CONSTRAINT IF EXISTS alternative_courses_provider_check;