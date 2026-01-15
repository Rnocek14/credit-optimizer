-- Create trigger to automatically set url_status = 'unknown' on new alt_credits records
-- This ensures new URLs are queued for verification and never shown to users until verified

-- Function to set url_status to 'unknown' if not provided
CREATE OR REPLACE FUNCTION set_url_status_unknown()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set to 'unknown' if url_status is null and there's a URL to verify
  IF NEW.url_status IS NULL AND NEW.provider_url IS NOT NULL THEN
    NEW.url_status := 'unknown';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS alt_credits_url_status_default ON alt_credits;

-- Create trigger on INSERT
CREATE TRIGGER alt_credits_url_status_default
  BEFORE INSERT ON alt_credits
  FOR EACH ROW
  EXECUTE FUNCTION set_url_status_unknown();

-- Also ensure any existing records with NULL url_status get set to 'unknown'
-- so they're flagged for verification
UPDATE alt_credits 
SET url_status = 'unknown'
WHERE url_status IS NULL AND provider_url IS NOT NULL;

-- Add a comment explaining the pattern
COMMENT ON FUNCTION set_url_status_unknown() IS 
  'Ensures new alt_credits records have url_status=unknown until verified. This prevents broken URLs from ever reaching users.';