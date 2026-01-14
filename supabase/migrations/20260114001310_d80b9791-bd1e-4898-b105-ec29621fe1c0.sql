-- Fix the baseline duration formula regression
-- The formula was incorrectly calculating 320 weeks instead of 128 weeks for per-credit schools

CREATE OR REPLACE FUNCTION public.compute_template_baseline(
  p_institution_code TEXT,
  p_total_credits INTEGER
)
RETURNS TABLE(cost_usd NUMERIC, weeks INTEGER, source TEXT, notes TEXT)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_pricing RECORD;
  v_cost NUMERIC;
  v_weeks INTEGER;
BEGIN
  -- Get pricing for this institution
  SELECT * INTO v_pricing
  FROM institution_pricing_packs
  WHERE institution_code = p_institution_code
    AND status = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Calculate cost based on pricing model
  IF v_pricing.pricing_model = 'per_credit' THEN
    v_cost := p_total_credits * COALESCE((v_pricing.pricing_data->>'per_credit_rate')::NUMERIC, 350);
  ELSIF v_pricing.pricing_model = 'flat_term' THEN
    -- Assume 4 terms for a bachelor's degree at flat-term schools
    v_cost := 4 * COALESCE((v_pricing.pricing_data->>'term_rate')::NUMERIC, 4000);
  ELSE
    -- Default fallback
    v_cost := p_total_credits * 350;
  END IF;

  -- Calculate duration: ~15 credits per 16-week term (standard full-time pace)
  -- This gives ~128 weeks (30 months) for a 120-credit degree
  v_weeks := CEIL(p_total_credits::NUMERIC / 15) * 16;

  RETURN QUERY SELECT 
    v_cost,
    v_weeks,
    'computed'::TEXT,
    format('Based on %s pricing model, %s credits at standard pace', 
           v_pricing.pricing_model, p_total_credits)::TEXT;
END;
$$;

-- Delete incorrect baseline snapshots that were computed with the wrong formula
DELETE FROM template_baseline_snapshots 
WHERE baseline_weeks = 320;