-- Add proper structured columns for URL verification (not JSON in url_notes)
ALTER TABLE alt_credits 
ADD COLUMN IF NOT EXISTS suggested_urls JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS verification_method TEXT,
ADD COLUMN IF NOT EXISTS verified_by TEXT,
ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(4,3);

-- Add constraint for valid url_status values
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'alt_credits_url_status_check'
  ) THEN
    ALTER TABLE alt_credits
    ADD CONSTRAINT alt_credits_url_status_check
    CHECK (url_status IS NULL OR url_status IN ('unknown', 'valid', 'invalid', 'needs_review'));
  END IF;
END $$;

-- Index for efficiently finding items that need review
CREATE INDEX IF NOT EXISTS idx_alt_credits_needs_review 
ON alt_credits(url_status) WHERE url_status = 'needs_review';

-- Index for finding stale valid URLs that need re-verification
CREATE INDEX IF NOT EXISTS idx_alt_credits_recheck
ON alt_credits(url_checked_at) WHERE url_status = 'valid';