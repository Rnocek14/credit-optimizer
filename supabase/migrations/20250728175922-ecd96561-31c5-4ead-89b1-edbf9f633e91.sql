-- Step 1: Database cleanup and constraints (simplified approach)

-- Clean up existing duplicates by keeping only the most recent entry for each pattern type
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

-- Add an updated_at column for better tracking
ALTER TABLE pattern_recognition_results 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create function to auto-update the updated_at field
CREATE OR REPLACE FUNCTION update_pattern_recognition_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_pattern_recognition_updated_at_trigger ON pattern_recognition_results;
CREATE TRIGGER update_pattern_recognition_updated_at_trigger
  BEFORE UPDATE ON pattern_recognition_results
  FOR EACH ROW
  EXECUTE FUNCTION update_pattern_recognition_updated_at();