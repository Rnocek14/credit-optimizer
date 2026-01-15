-- Fix UPDATE RLS policy: allow editing other fields but lock url_status
-- This prevents the issue where WITH CHECK (url_status <> 'valid') blocks ALL updates to valid rows

DROP POLICY IF EXISTS "Prevent clients from setting valid status on update" ON public.alt_credits;

CREATE POLICY "Clients can update alt_credits except url_status"
  ON public.alt_credits
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (
    url_status = (SELECT a.url_status FROM public.alt_credits a WHERE a.id = alt_credits.id)
  );

-- Drop old constraint if exists and add proper btrim-based empty string check
ALTER TABLE public.alt_credits
  DROP CONSTRAINT IF EXISTS alt_credits_provider_url_not_empty;

ALTER TABLE public.alt_credits
  ADD CONSTRAINT alt_credits_provider_url_not_blank
  CHECK (provider_url IS NULL OR length(btrim(provider_url)) > 0);