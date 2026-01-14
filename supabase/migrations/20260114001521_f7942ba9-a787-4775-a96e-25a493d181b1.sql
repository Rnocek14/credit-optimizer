-- Insert correct baselines for COSC V2 templates that were deleted
INSERT INTO template_baseline_snapshots (
  template_id, institution_code, program_code, 
  baseline_cost_usd, baseline_weeks, baseline_status, 
  source_description, inputs
)
SELECT 
  dt.id,
  dt.institution_code,
  dt.program_code,
  39560, -- 120 credits × $329.67/credit (COSC rate)
  128,   -- Correct: CEIL(120/15)*16 = 128 weeks
  'verified',
  'COSC Direct (120cr × $329.67/credit)',
  jsonb_build_object(
    'pricing_model', 'per_credit',
    'total_credits', 120,
    'assumptions', 'Connecticut residents pay less. Standard undergraduate rate shown.'
  )
FROM degree_templates dt
WHERE dt.id IN ('COSC-BSBA-ALT_MAX-V2', 'COSC-BSBA-STANDARD-V2')
AND NOT EXISTS (
  SELECT 1 FROM template_baseline_snapshots tbs WHERE tbs.template_id = dt.id
);