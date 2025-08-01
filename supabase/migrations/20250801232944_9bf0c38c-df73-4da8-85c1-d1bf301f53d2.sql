-- Create test user profile first, then initialize Phase 4 data

-- Create test user profile if it doesn't exist
INSERT INTO public.profiles (user_id, name, email) 
SELECT 
  '00000000-0000-0000-0000-000000000001',
  'Test User',
  'test@example.com'
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = '00000000-0000-0000-0000-000000000001'
);

-- Create CRI goal for test user
INSERT INTO public.user_cri_goals (user_id, target_cri) 
SELECT '00000000-0000-0000-0000-000000000001', 85
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_cri_goals 
  WHERE user_id = '00000000-0000-0000-0000-000000000001'
);

-- Create sample autonomous workflows for test user
INSERT INTO public.autonomous_workflows (
  user_id, title, description, workflow_type, target_outcome, status, priority, progress_percentage, config, context_data
) 
SELECT 
  '00000000-0000-0000-0000-000000000001',
  'AI-Driven Skill Development Plan',
  'Automated learning path optimization based on market trends and personal goals',
  'skill_development',
  'Achieve 85% CRI score through targeted skill acquisition',
  'active',
  'high',
  35,
  '{"auto_approve": false, "notification_threshold": 0.8}'::jsonb,
  '{"target_skills": ["machine_learning", "data_analysis"], "timeline_weeks": 12}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.autonomous_workflows 
  WHERE user_id = '00000000-0000-0000-0000-000000000001' AND title = 'AI-Driven Skill Development Plan'
);

INSERT INTO public.autonomous_workflows (
  user_id, title, description, workflow_type, target_outcome, status, priority, progress_percentage, config, context_data
) 
SELECT 
  '00000000-0000-0000-0000-000000000001',
  'Market Intelligence Monitoring',
  'Continuous monitoring of job market trends for career optimization',
  'market_monitoring',
  'Stay ahead of market changes with 95% accuracy predictions',
  'active',
  'medium',
  60,
  '{"check_frequency": "daily", "alert_threshold": 0.7}'::jsonb,
  '{"monitored_roles": ["data_scientist", "ml_engineer"], "location": "San Francisco"}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.autonomous_workflows 
  WHERE user_id = '00000000-0000-0000-0000-000000000001' AND title = 'Market Intelligence Monitoring'
);

-- Create sample Maya decisions for test user
INSERT INTO public.maya_decisions (
  user_id, decision_type, decision_data, confidence_score, rationale, status, execution_result
) 
SELECT 
  '00000000-0000-0000-0000-000000000001',
  'skill_prioritization',
  '{"recommended_skill": "machine_learning", "priority_score": 9.2, "market_demand": "high"}'::jsonb,
  0.89,
  'Based on current market trends and user profile, ML skills show highest ROI potential',
  'approved',
  '{"skill_added": true, "learning_path_created": true}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.maya_decisions 
  WHERE user_id = '00000000-0000-0000-0000-000000000001' AND decision_type = 'skill_prioritization'
);

INSERT INTO public.maya_decisions (
  user_id, decision_type, decision_data, confidence_score, rationale, status, execution_result
) 
SELECT 
  '00000000-0000-0000-0000-000000000001',
  'market_opportunity_alert',
  '{"opportunity": "senior_data_scientist", "urgency": "high", "match_score": 0.87}'::jsonb,
  0.85,
  'Significant market opportunity detected matching user skills and goals',
  'approved',
  '{"alert_created": true, "workflow_triggered": true}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.maya_decisions 
  WHERE user_id = '00000000-0000-0000-0000-000000000001' AND decision_type = 'market_opportunity_alert'
);