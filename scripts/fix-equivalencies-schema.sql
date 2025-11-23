-- Add missing notes column to cross_institution_equivalencies table
-- Run this BEFORE running seed-optimizer-complete.sql

-- Add notes column for additional equivalency information
ALTER TABLE cross_institution_equivalencies 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Verify the column was added and show all columns
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'cross_institution_equivalencies'
ORDER BY ordinal_position;
