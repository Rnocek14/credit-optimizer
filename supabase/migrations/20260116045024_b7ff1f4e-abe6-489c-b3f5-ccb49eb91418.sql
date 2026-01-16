-- ============================================
-- Institution Override Settings
-- Per-institution configuration overrides for invariant thresholds/gates
-- ============================================

CREATE TABLE public.institution_override_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_code TEXT NOT NULL UNIQUE,
  overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_institution_override_settings_code ON public.institution_override_settings(institution_code);
CREATE INDEX idx_institution_override_settings_status ON public.institution_override_settings(status);

-- Enable RLS
ALTER TABLE public.institution_override_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write
CREATE POLICY "Admins can read institution overrides"
  ON public.institution_override_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert institution overrides"
  ON public.institution_override_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update institution overrides"
  ON public.institution_override_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete institution overrides"
  ON public.institution_override_settings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- Institution Override Audit Log
-- Tracks all changes to override settings
-- ============================================

CREATE TABLE public.institution_override_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_code TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'disable', 'enable')),
  old_overrides JSONB,
  new_overrides JSONB,
  reason TEXT,
  actor_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for audit queries
CREATE INDEX idx_institution_override_audit_code ON public.institution_override_audit(institution_code);
CREATE INDEX idx_institution_override_audit_created ON public.institution_override_audit(created_at DESC);
CREATE INDEX idx_institution_override_audit_actor ON public.institution_override_audit(actor_user_id);

-- Enable RLS
ALTER TABLE public.institution_override_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit log
CREATE POLICY "Admins can read override audit"
  ON public.institution_override_audit
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can insert audit entries
CREATE POLICY "Admins can insert override audit"
  ON public.institution_override_audit
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_institution_override_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_institution_override_timestamp
  BEFORE UPDATE ON public.institution_override_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_institution_override_timestamp();

-- Add comment for documentation
COMMENT ON TABLE public.institution_override_settings IS 'Per-institution configuration overrides for invariant thresholds and gates. Bounded, audit-logged, dashboard-safe.';
COMMENT ON TABLE public.institution_override_audit IS 'Audit log for all changes to institution override settings.';