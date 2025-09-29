-- Fix views with correct enum values
CREATE OR REPLACE VIEW requirement_options_view AS
SELECT
  ro.requirement_id,
  ro.option_kind,
  ro.option_ref_id as course_id,
  mc.title, 
  mc.credits, 
  mc.cost_usd, 
  mc.duration_weeks, 
  mc.modality,
  mc.cri_score, 
  mc.level, 
  mc.skill_tags,
  p.id as provider_id, 
  p.name as provider_name, 
  p.type as provider_type,
  -- Transfer fit calculation
  CASE 
    WHEN mc.credits >= 3 AND mc.cost_usd < 500 THEN 'excellent'
    WHEN mc.credits >= 3 AND mc.cost_usd < 1000 THEN 'good'
    ELSE 'fair'
  END as transfer_fit
FROM requirement_options ro
JOIN marketplace_courses mc ON mc.id = ro.option_ref_id AND ro.option_kind = 'course'
JOIN providers p ON p.id = mc.provider_id;

CREATE OR REPLACE VIEW requirement_option_counts AS
SELECT 
  requirement_id,
  COUNT(*)::int as options_count,
  BOOL_OR(ro.option_kind = 'exam') as has_clep,
  BOOL_OR(p.type = 'testing_center') as has_ace_credit
FROM requirement_options ro
LEFT JOIN marketplace_courses mc ON mc.id = ro.option_ref_id AND ro.option_kind = 'course'
LEFT JOIN providers p ON p.id = mc.provider_id
GROUP BY requirement_id;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_requirement_options_requirement_id ON requirement_options (requirement_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_courses_provider_id ON marketplace_courses (provider_id);
CREATE INDEX IF NOT EXISTS idx_user_plan_courses_plan_id ON user_plan_courses (plan_id);
CREATE INDEX IF NOT EXISTS idx_user_plans_user_id ON user_plans (user_id);