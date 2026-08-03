-- Analytics events sink.
-- The frontend has been fully instrumented since the funnel was built
-- (get_started_*, compare_*, plan_preview_viewed, email_captured, guide events)
-- but src/lib/analytics.ts only logged to the console. This table turns it on.
-- RLS mirrors lead_captures: anyone may INSERT (with size guards), only
-- admins may read. No UPDATE/DELETE for anyone below admin.

CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  session_id text CHECK (session_id IS NULL OR char_length(session_id) <= 64),
  path text CHECK (path IS NULL OR char_length(path) <= 512),
  referrer text CHECK (referrer IS NULL OR char_length(referrer) <= 1024),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_name_created ON public.events (name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_session ON public.events (session_id, created_at);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Anyone (anon or authenticated) may write events; payload size is capped to
-- keep abuse cheap to absorb.
CREATE POLICY "events_insert_public"
  ON public.events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (pg_column_size(payload) <= 8192);

-- Only admins may read analytics.
CREATE POLICY "events_select_admin"
  ON public.events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
