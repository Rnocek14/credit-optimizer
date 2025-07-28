-- Step 1: Database cleanup and constraints

-- First, let's add a composite unique constraint to prevent future duplicates
-- This will allow only one pattern per career/location/type per day
ALTER TABLE pattern_recognition_results 
ADD CONSTRAINT unique_pattern_per_day 
UNIQUE (career_path, location, pattern_type, (detected_at::date));

-- Clean up existing duplicates by keeping only the most recent entry for each pattern type
-- We'll do this by creating a temporary table with the latest entries
WITH latest_patterns AS (
  SELECT DISTINCT ON (career_path, location, pattern_type) 
    id,
    career_path,
    location,
    pattern_type,
    detected_at
  FROM pattern_recognition_results
  ORDER BY career_path, location, pattern_type, detected_at DESC
)
DELETE FROM pattern_recognition_results 
WHERE id NOT IN (SELECT id FROM latest_patterns);

-- Add an updated_at column with trigger for better tracking
ALTER TABLE pattern_recognition_results 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create trigger to auto-update the updated_at field
CREATE OR REPLACE FUNCTION update_pattern_recognition_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pattern_recognition_updated_at_trigger
  BEFORE UPDATE ON pattern_recognition_results
  FOR EACH ROW
  EXECUTE FUNCTION update_pattern_recognition_updated_at();