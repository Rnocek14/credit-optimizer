-- Add missing columns to alt_credits table
-- Run this BEFORE running seed-optimizer-complete.sql

-- Add description column for detailed course information
ALTER TABLE alt_credits 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add ace_id for ACE credit recommendation tracking
ALTER TABLE alt_credits 
ADD COLUMN IF NOT EXISTS ace_id TEXT;

-- Add metadata JSONB column for additional structured data
-- (passing scores, exam lengths, prerequisites, etc.)
ALTER TABLE alt_credits 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create index for efficient ace_id lookups
CREATE INDEX IF NOT EXISTS idx_alt_credits_ace_id ON alt_credits(ace_id);

-- Verify columns were added
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'alt_credits'
  AND column_name IN ('description', 'ace_id', 'metadata')
ORDER BY column_name;
