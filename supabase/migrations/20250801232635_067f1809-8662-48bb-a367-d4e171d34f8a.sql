-- Initialize test user data for Phase 4

-- Create CRI goal for test user (if not exists)
INSERT INTO public.user_cri_goals (user_id, target_cri) 
VALUES ('00000000-0000-0000-0000-000000000001', 85)
ON CONFLICT (user_id) DO UPDATE SET target_cri = 85;

-- Create sample autonomous workflows for test user
INSERT INTO public.autonomous_workflows (
  user_id, title, description, workflow_type, target_outcome, status, priority, progress_percentage, config, context_data
) VALUES 
(
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
),
(
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
),
(
  '00000000-0000-0000-0000-000000000001',
  'Automated Goal Adjustment',
  'AI-powered goal refinement based on progress and market conditions',
  'goal_optimization',
  'Maintain optimal goal alignment with 90% success probability',
  'planning',
  'high',
  15,
  '{"optimization_frequency": "weekly", "confidence_threshold": 0.85}'::jsonb,
  '{"current_goals": 3, "adjustment_history": []}'::jsonb
)
ON CONFLICT DO NOTHING;

-- Create sample Maya decisions for test user
INSERT INTO public.maya_decisions (
  user_id, decision_type, decision_data, confidence_score, rationale, status, execution_result
) VALUES 
(
  '00000000-0000-0000-0000-000000000001',
  'skill_prioritization',
  '{"recommended_skill": "machine_learning", "priority_score": 9.2, "market_demand": "high"}'::jsonb,
  0.89,
  'Based on current market trends and user profile, ML skills show highest ROI potential',
  'approved',
  '{"skill_added": true, "learning_path_created": true}'::jsonb
),
(
  '00000000-0000-0000-0000-000000000001',
  'goal_timeline_adjustment',
  '{"goal_id": "goal_123", "new_timeline": "8_weeks", "reason": "accelerated_path_available"}'::jsonb,
  0.92,
  'New accelerated learning path identified with 95% success rate',
  'pending',
  '{}'::jsonb
),
(
  '00000000-0000-0000-0000-000000000001',
  'market_opportunity_alert',
  '{"opportunity": "senior_data_scientist", "urgency": "high", "match_score": 0.87}'::jsonb,
  0.85,
  'Significant market opportunity detected matching user skills and goals',
  'approved',
  '{"alert_created": true, "workflow_triggered": true}'::jsonb
)
ON CONFLICT DO NOTHING;