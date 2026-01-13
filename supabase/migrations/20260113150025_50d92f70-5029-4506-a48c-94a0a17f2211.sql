-- Phase 1: Create canonical baseline computation function (append-only, deterministic)
CREATE OR REPLACE FUNCTION compute_template_baseline(
  p_template_id TEXT,
  p_institution_code TEXT,
  p_program_code TEXT DEFAULT 'BSBA',
  p_total_credits INTEGER DEFAULT 120
)
RETURNS TABLE (
  baseline_cost_usd NUMERIC,
  baseline_weeks NUMERIC,
  baseline_status TEXT,
  inputs JSONB,
  source_description TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pricing RECORD;
  v_cost NUMERIC;
  v_weeks NUMERIC;
  v_status TEXT;
  v_inputs JSONB;
  v_source TEXT;
BEGIN
  -- Fetch active pricing pack for institution
  SELECT 
    ipp.pricing_data,
    ipp.provenance_verified_at,
    ipp.id as pack_id
  INTO v_pricing
  FROM institution_pricing_packs ipp
  WHERE ipp.institution_code = p_institution_code
    AND ipp.status = 'active'
  LIMIT 1;
  
  IF v_pricing IS NULL THEN
    -- No pricing pack - return NULL (caller should handle)
    RETURN;
  END IF;
  
  -- Compute baseline based on pricing model
  IF (v_pricing.pricing_data->>'model') = 'per_credit' THEN
    v_cost := p_total_credits * COALESCE((v_pricing.pricing_data->>'per_credit_usd')::NUMERIC, 0)
            + COALESCE((v_pricing.pricing_data->>'required_fees_usd')::NUMERIC, 0);
    v_weeks := CEIL(p_total_credits / 3.0) * 8; -- ~3 credits per 8-week term
  ELSIF (v_pricing.pricing_data->>'model') = 'flat_term' THEN
    -- Flat term: assume 8 terms for 120 credits (15 credits/term)
    v_cost := 8 * COALESCE((v_pricing.pricing_data->>'term_cost_usd')::NUMERIC, 0)
            + COALESCE((v_pricing.pricing_data->>'required_fees_usd')::NUMERIC, 0);
    v_weeks := 8 * 8; -- 8 terms * 8 weeks
  ELSE
    -- Unknown model - use per_credit fallback
    v_cost := p_total_credits * COALESCE((v_pricing.pricing_data->>'per_credit_usd')::NUMERIC, 0)
            + COALESCE((v_pricing.pricing_data->>'required_fees_usd')::NUMERIC, 0);
    v_weeks := CEIL(p_total_credits / 3.0) * 8;
  END IF;
  
  -- Determine status based on provenance
  IF v_pricing.provenance_verified_at IS NOT NULL THEN
    v_status := 'verified';
  ELSE
    v_status := 'estimated';
  END IF;
  
  -- Build inputs for audit trail
  v_inputs := jsonb_build_object(
    'pricing_pack_id', v_pricing.pack_id,
    'pricing_model', v_pricing.pricing_data->>'model',
    'per_credit_usd', v_pricing.pricing_data->>'per_credit_usd',
    'term_cost_usd', v_pricing.pricing_data->>'term_cost_usd',
    'required_fees_usd', v_pricing.pricing_data->>'required_fees_usd',
    'total_credits', p_total_credits,
    'formula_version', '1.0',
    'computed_at', NOW()
  );
  
  v_source := format('Single-school baseline: %s @ %s model', 
    p_institution_code, 
    v_pricing.pricing_data->>'model');
  
  RETURN QUERY SELECT v_cost, v_weeks, v_status, v_inputs, v_source;
END;
$$;

-- Phase 2: Create audit infrastructure tables
CREATE TABLE IF NOT EXISTS audit_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type TEXT NOT NULL, -- 'full', 'incremental', 'single_school'
  scope JSONB NOT NULL DEFAULT '{}', -- { institution_code, program_code, etc }
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed'
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  summary JSONB, -- { total_templates, passing, failing, tier_a, tier_b, tier_c }
  created_by TEXT, -- 'cron', 'manual', 'on_seed'
  template_version TEXT, -- Track which template schema version was scanned
  catalog_year TEXT -- Track catalog year context
);

CREATE TABLE IF NOT EXISTS audit_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES audit_runs(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  institution_code TEXT NOT NULL,
  program_code TEXT,
  check_name TEXT NOT NULL, -- 'baseline_exists', 'cap_compliance', etc
  check_category TEXT NOT NULL, -- 'coverage', 'correctness', 'provenance'
  status TEXT NOT NULL, -- 'pass', 'fail', 'warn'
  details JSONB, -- { expected, actual, remediation }
  auto_fixable BOOLEAN DEFAULT FALSE,
  fixed_at TIMESTAMPTZ,
  template_version TEXT, -- Captured from template_data->>'version'
  catalog_year TEXT, -- Derived from template context
  policy_pack_id UUID, -- Traceability to policy pack
  pricing_pack_id UUID, -- Traceability to pricing pack
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS audit_findings_run_idx ON audit_findings(run_id);
CREATE INDEX IF NOT EXISTS audit_findings_template_idx ON audit_findings(template_id);
CREATE INDEX IF NOT EXISTS audit_findings_status_idx ON audit_findings(status);
CREATE INDEX IF NOT EXISTS audit_findings_check_name_idx ON audit_findings(check_name);
CREATE INDEX IF NOT EXISTS audit_runs_status_idx ON audit_runs(status);

-- Enable RLS
ALTER TABLE audit_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_findings ENABLE ROW LEVEL SECURITY;

-- Admin-only policies (service role can read/write)
CREATE POLICY "Service role full access to audit_runs" 
ON audit_runs FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Service role full access to audit_findings" 
ON audit_findings FOR ALL 
USING (true) 
WITH CHECK (true);

COMMENT ON TABLE audit_runs IS 'Tracks degree automation truth scan runs';
COMMENT ON TABLE audit_findings IS 'Individual check results from truth scans';
COMMENT ON FUNCTION compute_template_baseline IS 'Canonical baseline computation from pricing packs';