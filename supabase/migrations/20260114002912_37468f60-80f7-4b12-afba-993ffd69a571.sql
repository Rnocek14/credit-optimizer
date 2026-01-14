-- Delete stale WGU V2 baselines (will be regenerated with correct function)
DELETE FROM template_baseline_snapshots WHERE template_id LIKE 'WGU%-V2';

-- Also regenerate baselines for WGU using the fixed function
INSERT INTO template_baseline_snapshots (
  template_id, institution_code, program_code, 
  baseline_cost_usd, baseline_weeks, baseline_status, 
  source_description, inputs
)
SELECT 
  dt.id,
  dt.institution_code,
  dt.program_code,
  baseline.cost_usd,
  baseline.weeks,
  'verified',
  baseline.notes,
  jsonb_build_object(
    'pricing_model', 'flat_term',
    'term_cost_usd', 3995,
    'typical_terms', 4,
    'term_weeks', 26,
    'computed_via', 'compute_template_baseline v2'
  )
FROM degree_templates dt
CROSS JOIN LATERAL compute_template_baseline(dt.institution_code, dt.total_credits) AS baseline
WHERE dt.id LIKE 'WGU%-V2'
AND NOT EXISTS (
  SELECT 1 FROM template_baseline_snapshots tbs WHERE tbs.template_id = dt.id
);