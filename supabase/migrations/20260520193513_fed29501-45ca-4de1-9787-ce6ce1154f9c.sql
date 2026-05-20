CREATE TABLE public.lead_captures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  template_id TEXT,
  career_id TEXT,
  credits_completed INTEGER,
  source TEXT NOT NULL DEFAULT 'plan_preview',
  referrer TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_captures_email ON public.lead_captures(email);
CREATE INDEX idx_lead_captures_created_at ON public.lead_captures(created_at DESC);
CREATE INDEX idx_lead_captures_template_id ON public.lead_captures(template_id);

ALTER TABLE public.lead_captures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a lead capture"
  ON public.lead_captures
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (email IS NOT NULL AND length(email) > 3 AND length(email) < 255);

CREATE POLICY "Admins can view all lead captures"
  ON public.lead_captures
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update lead captures"
  ON public.lead_captures
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete lead captures"
  ON public.lead_captures
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));