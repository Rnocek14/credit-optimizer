-- ============================================================================
-- Dynamic V1 Scope Table
-- Replaces hardcoded V1_ALLOWED_INSTITUTIONS with database-driven scope
-- ============================================================================

-- Create the V1 scope table
CREATE TABLE IF NOT EXISTS public.institution_v1_scope (
  institution_code TEXT PRIMARY KEY,
  enabled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  enabled_by UUID REFERENCES auth.users(id),
  evidence_coverage_pct NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.institution_v1_scope ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone can read scope (needed for frontend checks)
CREATE POLICY "V1 scope is publicly readable"
  ON public.institution_v1_scope
  FOR SELECT
  USING (true);

-- RLS: Only service role can insert/update/delete (admin operations)
-- This is handled by edge functions with service role key

-- Seed existing V1 institutions (from the hardcoded list)
INSERT INTO public.institution_v1_scope (institution_code, evidence_coverage_pct, notes)
VALUES 
  ('TESU', 78.8, 'V1 launch institution - evidence verified'),
  ('COSC', 83.1, 'V1 launch institution - evidence verified'),
  ('WGU', 56.9, 'V1 launch institution - evidence verified'),
  ('EXCELSIOR', 50.0, 'V1.1 expansion - pending full evidence audit'),
  ('EMPIRE', 50.0, 'V1.1 expansion - pending full evidence audit')
ON CONFLICT (institution_code) DO NOTHING;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_institution_v1_scope_code 
  ON public.institution_v1_scope (institution_code);

-- Function to check if institution is in V1 scope (for use in other RPC functions)
CREATE OR REPLACE FUNCTION public.is_v1_institution(p_institution_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  IF p_institution_code IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 
    FROM public.institution_v1_scope 
    WHERE institution_code = UPPER(TRIM(p_institution_code))
  );
END;
$$;

-- Function to get all V1 institutions (for frontend list)
CREATE OR REPLACE FUNCTION public.get_v1_institutions()
RETURNS TABLE (
  institution_code TEXT,
  enabled_at TIMESTAMPTZ,
  evidence_coverage_pct NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.institution_code,
    s.enabled_at,
    s.evidence_coverage_pct
  FROM public.institution_v1_scope s
  ORDER BY s.enabled_at ASC;
END;
$$;

-- Comment for documentation
COMMENT ON TABLE public.institution_v1_scope IS 
'Dynamic V1 scope configuration. Institutions in this table are enabled for V1 features. 
Replaces hardcoded V1_ALLOWED_INSTITUTIONS list. Add institutions via admin UI after:
1. Evidence coverage >= 50%
2. Active policy pack with required fields
3. Ground truth verification (recommended)';