-- Strengthen alt_credits URL verification: 
-- 1. Explicit column defaults + NOT NULL
-- 2. RLS to prevent clients from setting url_status = 'valid'

-- First, ensure all existing NULLs are 'unknown'
UPDATE public.alt_credits 
SET url_status = 'unknown' 
WHERE url_status IS NULL;

-- Set explicit column default
ALTER TABLE public.alt_credits 
  ALTER COLUMN url_status SET DEFAULT 'unknown';

-- Make url_status NOT NULL for deterministic behavior
ALTER TABLE public.alt_credits 
  ALTER COLUMN url_status SET NOT NULL;

-- Add constraint: provider_url cannot be empty string if provided
-- (NULL is fine, but empty string is not)
ALTER TABLE public.alt_credits 
  DROP CONSTRAINT IF EXISTS alt_credits_provider_url_not_empty;
ALTER TABLE public.alt_credits 
  ADD CONSTRAINT alt_credits_provider_url_not_empty 
  CHECK (provider_url IS NULL OR length(trim(provider_url)) > 0);

-- RLS Policy: Prevent authenticated users from setting url_status = 'valid'
-- Service role bypasses RLS, so the verification worker can still set 'valid'

-- Drop existing policies if any (for idempotency)
DROP POLICY IF EXISTS "Prevent clients from setting valid status on insert" ON public.alt_credits;
DROP POLICY IF EXISTS "Prevent clients from setting valid status on update" ON public.alt_credits;
DROP POLICY IF EXISTS "Allow read access to alt_credits" ON public.alt_credits;
DROP POLICY IF EXISTS "Allow service role full access to alt_credits" ON public.alt_credits;

-- Enable RLS on the table
ALTER TABLE public.alt_credits ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read alt_credits (public catalog data)
CREATE POLICY "Allow read access to alt_credits"
  ON public.alt_credits
  FOR SELECT
  USING (true);

-- Authenticated users can INSERT, but NOT with url_status = 'valid'
-- Service role bypasses this, so verification worker can set 'valid'
CREATE POLICY "Prevent clients from setting valid status on insert"
  ON public.alt_credits
  FOR INSERT
  TO authenticated
  WITH CHECK (url_status <> 'valid');

-- Authenticated users can UPDATE, but cannot change url_status TO 'valid'
-- Service role bypasses this, so verification worker can set 'valid'
CREATE POLICY "Prevent clients from setting valid status on update"
  ON public.alt_credits
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (url_status <> 'valid');

-- Note: Service role (used by edge functions) bypasses RLS entirely,
-- so the url-verify-worker can still set url_status = 'valid'