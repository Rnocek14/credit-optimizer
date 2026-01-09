-- Add policy_data and provenance_url columns that the trigger expects
ALTER TABLE institution_policy_packs
ADD COLUMN IF NOT EXISTS policy_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS provenance_url TEXT;