-- =====================================================
-- Platform-wide Cost Engine: Provider Pricing + Cost Snapshots
-- =====================================================

-- 1. ALT PROVIDER PRICING PACKS
-- Stores pricing for alt-credit providers (Sophia, CLEP, DSST, Study.com, etc.)
CREATE TABLE public.alt_provider_pricing_packs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_code TEXT NOT NULL UNIQUE, -- e.g., 'SOPHIA', 'CLEP', 'DSST', 'STUDY_COM'
  provider_name TEXT NOT NULL,
  pricing_data JSONB NOT NULL DEFAULT '{}',
  -- pricing_data structure:
  -- {
  --   "model": "subscription" | "per_course" | "per_exam",
  --   "effective_cost_per_credit_usd": 99,  -- standardized rate for calculations
  --   "monthly_usd": 99,                     -- for subscription models
  --   "avg_credits_per_month": 3,            -- for subscription models
  --   "per_exam_usd": 90,                    -- for exam-based
  --   "per_course_usd": 199,                 -- for per-course models
  --   "notes": "string"
  -- }
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  provenance_verified_at TIMESTAMPTZ,
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.alt_provider_pricing_packs ENABLE ROW LEVEL SECURITY;

-- Public read access (pricing is public info)
CREATE POLICY "Anyone can read provider pricing" 
ON public.alt_provider_pricing_packs 
FOR SELECT 
USING (true);

-- 2. TEMPLATE COST SNAPSHOTS
-- Stores computed plan costs with full audit trail
CREATE TABLE public.template_cost_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES public.degree_templates(id) ON DELETE CASCADE,
  institution_code TEXT NOT NULL,
  
  -- Plan (multi-school strategy) costs
  plan_cost_usd NUMERIC(10,2) NOT NULL,
  plan_weeks NUMERIC(6,2) NOT NULL DEFAULT 0,
  
  -- Credit breakdown
  alt_credits INTEGER NOT NULL DEFAULT 0,
  institutional_credits INTEGER NOT NULL DEFAULT 0,
  total_credits INTEGER NOT NULL,
  
  -- Computation inputs (audit trail)
  inputs JSONB NOT NULL DEFAULT '{}',
  -- inputs structure:
  -- {
  --   "institution_pricing_pack_id": "uuid",
  --   "per_credit_usd": 564,
  --   "fees_usd": 200,
  --   "provider_rates_used": { "SOPHIA": 99, "CLEP": 90 },
  --   "alt_credits_by_provider": { "SOPHIA": 30, "CLEP": 15 },
  --   "residency_credits_required": 30,
  --   "formula_version": "2.0"
  -- }
  
  -- Status tracking
  cost_status TEXT NOT NULL DEFAULT 'verified' CHECK (cost_status IN ('verified', 'estimated', 'missing')),
  source_description TEXT,
  
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient lookups
CREATE INDEX idx_template_cost_snapshots_template ON public.template_cost_snapshots(template_id);
CREATE INDEX idx_template_cost_snapshots_computed ON public.template_cost_snapshots(template_id, computed_at DESC);

-- Enable RLS
ALTER TABLE public.template_cost_snapshots ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can read cost snapshots" 
ON public.template_cost_snapshots 
FOR SELECT 
USING (true);

-- 3. SEED INITIAL PROVIDER PRICING DATA
INSERT INTO public.alt_provider_pricing_packs (provider_code, provider_name, pricing_data, status, provenance_verified_at, source_url)
VALUES 
  ('SOPHIA', 'Sophia Learning', 
   '{"model": "subscription", "effective_cost_per_credit_usd": 33, "monthly_usd": 99, "avg_credits_per_month": 3, "notes": "Self-paced, monthly subscription. Students typically complete 3+ credits/month."}'::jsonb,
   'active', now(), 'https://www.sophia.org/'),
   
  ('CLEP', 'CLEP Exams', 
   '{"model": "per_exam", "effective_cost_per_credit_usd": 30, "per_exam_usd": 90, "credits_per_exam": 3, "notes": "College Board exams. $90 per exam, typically 3 credits each."}'::jsonb,
   'active', now(), 'https://clep.collegeboard.org/'),
   
  ('DSST', 'DSST Exams', 
   '{"model": "per_exam", "effective_cost_per_credit_usd": 28, "per_exam_usd": 85, "credits_per_exam": 3, "notes": "Prometric exams. $85 per exam, typically 3 credits each."}'::jsonb,
   'active', now(), 'https://getcollegecredit.com/'),
   
  ('STUDY_COM', 'Study.com', 
   '{"model": "per_course", "effective_cost_per_credit_usd": 66, "per_course_usd": 199, "credits_per_course": 3, "notes": "Self-paced courses. $199 per course, 3 credits each."}'::jsonb,
   'active', now(), 'https://study.com/'),
   
  ('STRAIGHTERLINE', 'StraighterLine', 
   '{"model": "subscription", "effective_cost_per_credit_usd": 50, "monthly_usd": 99, "per_course_usd": 59, "avg_credits_per_month": 3, "notes": "Monthly subscription + per-course fee."}'::jsonb,
   'active', now(), 'https://www.straighterline.com/'),
   
  ('SAYLOR', 'Saylor Academy', 
   '{"model": "per_exam", "effective_cost_per_credit_usd": 8, "per_exam_usd": 25, "credits_per_exam": 3, "notes": "Free courses, $25 proctored exam for credit recommendation."}'::jsonb,
   'active', now(), 'https://www.saylor.org/')
ON CONFLICT (provider_code) DO UPDATE SET
  pricing_data = EXCLUDED.pricing_data,
  status = EXCLUDED.status,
  provenance_verified_at = EXCLUDED.provenance_verified_at,
  updated_at = now();

-- 4. Create view for latest cost snapshot per template
CREATE OR REPLACE VIEW public.template_cost_latest AS
SELECT DISTINCT ON (template_id)
  id,
  template_id,
  institution_code,
  plan_cost_usd,
  plan_weeks,
  alt_credits,
  institutional_credits,
  total_credits,
  inputs,
  cost_status,
  source_description,
  computed_at
FROM public.template_cost_snapshots
ORDER BY template_id, computed_at DESC;

-- 5. Create view for combined template + baseline + cost snapshot
CREATE OR REPLACE VIEW public.template_with_costs AS
SELECT 
  dt.id AS template_id,
  dt.institution_code,
  dt.program_code,
  dt.track_type,
  dt.total_credits,
  dt.estimated_cost AS legacy_estimated_cost,
  dt.estimated_duration_months,
  
  -- Latest cost snapshot (plan costs)
  tcs.plan_cost_usd,
  tcs.plan_weeks,
  tcs.alt_credits,
  tcs.institutional_credits,
  tcs.cost_status AS plan_cost_status,
  tcs.computed_at AS plan_computed_at,
  
  -- Latest baseline snapshot
  tbs.baseline_cost_usd,
  tbs.baseline_weeks,
  tbs.baseline_status,
  tbs.computed_at AS baseline_computed_at,
  
  -- Computed savings (only when both verified)
  CASE 
    WHEN tbs.baseline_status = 'verified' AND tcs.cost_status = 'verified' 
         AND tbs.baseline_cost_usd > 0 AND tcs.plan_cost_usd > 0
    THEN ROUND(((tbs.baseline_cost_usd - tcs.plan_cost_usd) / tbs.baseline_cost_usd * 100)::numeric, 1)
    ELSE NULL
  END AS savings_pct,
  
  CASE 
    WHEN tbs.baseline_status = 'verified' AND tcs.cost_status = 'verified' 
         AND tbs.baseline_cost_usd > 0 AND tcs.plan_cost_usd > 0
    THEN ROUND((tbs.baseline_cost_usd - tcs.plan_cost_usd)::numeric, 2)
    ELSE NULL
  END AS savings_usd

FROM public.degree_templates dt
LEFT JOIN LATERAL (
  SELECT * FROM public.template_cost_snapshots 
  WHERE template_id = dt.id 
  ORDER BY computed_at DESC 
  LIMIT 1
) tcs ON true
LEFT JOIN LATERAL (
  SELECT * FROM public.template_baseline_snapshots 
  WHERE template_id = dt.id 
  ORDER BY computed_at DESC 
  LIMIT 1
) tbs ON true;