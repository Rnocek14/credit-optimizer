-- Add URL quality tracking fields to alt_credits table
-- These fields help track URL verification status and prevent broken links

-- URL status: 'valid', 'invalid', or 'unknown'
ALTER TABLE alt_credits
ADD COLUMN IF NOT EXISTS url_status TEXT DEFAULT 'unknown';

-- Timestamp of when URL was last checked
ALTER TABLE alt_credits
ADD COLUMN IF NOT EXISTS url_checked_at TIMESTAMPTZ;

-- HTTP status code from URL verification (200, 404, etc.)
ALTER TABLE alt_credits
ADD COLUMN IF NOT EXISTS url_http_status INTEGER;

-- Notes about URL issues or verification
ALTER TABLE alt_credits
ADD COLUMN IF NOT EXISTS url_notes TEXT;

-- Add comments for documentation
COMMENT ON COLUMN alt_credits.url_status IS 'URL verification status: valid, invalid, or unknown';
COMMENT ON COLUMN alt_credits.url_checked_at IS 'Timestamp of last URL verification check';
COMMENT ON COLUMN alt_credits.url_http_status IS 'HTTP status code from last URL check';
COMMENT ON COLUMN alt_credits.url_notes IS 'Notes about URL issues or verification details';

-- Create index for efficient filtering by URL status
CREATE INDEX IF NOT EXISTS idx_alt_credits_url_status ON alt_credits(url_status);