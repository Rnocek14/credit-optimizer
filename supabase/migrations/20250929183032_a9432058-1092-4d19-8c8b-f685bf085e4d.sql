-- Step 1a: Fix unique constraint (prevent double-filling requirements)
ALTER TABLE user_plan_courses 
  DROP CONSTRAINT IF EXISTS user_plan_courses_plan_id_course_id_key;

ALTER TABLE user_plan_courses
  ADD CONSTRAINT user_plan_courses_plan_req_uniq 
  UNIQUE (plan_id, requirement_id);

-- Step 1b: Fix requirement_option_counts view (proper ACE detection)
CREATE OR REPLACE VIEW requirement_option_counts AS
WITH opts AS (
  SELECT ro.requirement_id, ro.option_kind, p.name as provider_name
  FROM requirement_options ro
  LEFT JOIN marketplace_courses mc ON ro.option_kind='course' AND mc.id=ro.option_ref_id
  LEFT JOIN providers p ON mc.provider_id = p.id
)
SELECT
  requirement_id,
  COUNT(*)::int as options_count,
  BOOL_OR(option_kind = 'exam') as has_clep,
  BOOL_OR(provider_name IN ('Sophia Learning','Study.com')) as has_ace_credit
FROM opts
GROUP BY requirement_id;

-- Step 1c: Add transfer_fit to requirement_options_view
CREATE OR REPLACE VIEW requirement_options_view AS
SELECT
  ro.requirement_id, ro.option_kind, ro.option_ref_id as course_id,
  mc.title, mc.credits, mc.cost_usd, mc.duration_weeks,
  mc.modality, mc.cri_score, mc.level, mc.skill_tags,
  p.id as provider_id, p.name as provider_name, p.type as provider_type,
  CASE
    WHEN mc.cost_usd <= 250 AND COALESCE(mc.duration_weeks, 6) <= 6 THEN 'excellent'
    WHEN mc.cost_usd <= 800 THEN 'good'
    ELSE 'fair'
  END::text as transfer_fit
FROM requirement_options ro
JOIN marketplace_courses mc ON mc.id = ro.option_ref_id AND ro.option_kind='course'
JOIN providers p ON p.id = mc.provider_id;

-- Step 1d: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_req_opts_view_req ON requirement_options (requirement_id);
CREATE INDEX IF NOT EXISTS idx_upc_plan ON user_plan_courses (plan_id);
CREATE INDEX IF NOT EXISTS idx_mk_courses_provider ON marketplace_courses (provider_id);