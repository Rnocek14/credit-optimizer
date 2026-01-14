-- Fix compute_template_baseline function
-- Issues: 
-- 1. Uses v_pricing.pricing_model (non-existent column) instead of pricing_data->>'model'
-- 2. Uses 'term_rate' instead of 'term_cost_usd'
-- 3. Duration for flat-term schools doesn't use their term structure

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
  v_model TEXT;
  v_term_weeks INTEGER;
  v_typical_terms INTEGER;
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

  -- Extract model from pricing_data JSONB (not a column!)
  v_model := v_pricing.pricing_data->>'model';

  -- Calculate cost based on pricing model
  IF v_model = 'per_credit' THEN
    -- Per-credit: credits × rate + fees
    v_cost := p_total_credits * COALESCE((v_pricing.pricing_data->>'per_credit_usd')::NUMERIC, 350)
            + COALESCE((v_pricing.pricing_data->>'required_fees_usd')::NUMERIC, 0);
    -- Duration: ~15 credits per 16-week term (standard full-time pace)
    v_weeks := CEIL(p_total_credits::NUMERIC / 15) * 16;
    
  ELSIF v_model = 'flat_term' THEN
    -- Flat-term (WGU-style): terms × term_cost + fees
    v_typical_terms := COALESCE((v_pricing.pricing_data->>'typical_terms_to_complete')::INTEGER, 4);
    v_term_weeks := COALESCE((v_pricing.pricing_data->>'term_weeks')::INTEGER, 26);
    
    v_cost := v_typical_terms * COALESCE((v_pricing.pricing_data->>'term_cost_usd')::NUMERIC, 4000)
            + COALESCE((v_pricing.pricing_data->>'required_fees_usd')::NUMERIC, 0);
    -- Duration: typical_terms × term_weeks
    v_weeks := v_typical_terms * v_term_weeks;
    
  ELSE
    -- Unknown model - conservative per_credit fallback
    v_cost := p_total_credits * 350;
    v_weeks := CEIL(p_total_credits::NUMERIC / 15) * 16;
  END IF;

  RETURN QUERY SELECT 
    v_cost,
    v_weeks,
    'computed'::TEXT,
    format('Baseline for %s: %s model, %s credits/terms at typical pace', 
           p_institution_code, COALESCE(v_model, 'unknown'), p_total_credits)::TEXT;
END;
$$;