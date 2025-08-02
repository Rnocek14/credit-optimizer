-- Phase 5 Data Population for Test User

-- Populate workflow steps for existing workflow
INSERT INTO public.workflow_steps (workflow_id, user_id, step_name, step_type, step_order, status, input_data, output_data, confidence_score, started_at, completed_at)
VALUES 
  (
    (SELECT id FROM autonomous_workflows WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid LIMIT 1),
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Market Analysis',
    'analysis',
    1,
    'completed',
    '{"market_focus": "machine_learning", "location": "global"}'::jsonb,
    '{"demand_score": 92, "growth_rate": 15.3, "salary_trend": "increasing"}'::jsonb,
    0.94,
    now() - interval '2 days',
    now() - interval '2 days' + interval '45 minutes'
  ),
  (
    (SELECT id FROM autonomous_workflows WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid LIMIT 1),
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Skill Gap Assessment',
    'assessment',
    2,
    'completed',
    '{"current_skills": ["python", "data_analysis"], "target_skills": ["machine_learning", "deep_learning"]}'::jsonb,
    '{"gap_score": 67, "priority_skills": ["tensorflow", "pytorch", "ml_ops"], "estimated_hours": 120}'::jsonb,
    0.89,
    now() - interval '2 days' + interval '1 hour',
    now() - interval '1 day' + interval '30 minutes'
  ),
  (
    (SELECT id FROM autonomous_workflows WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid LIMIT 1),
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Learning Path Generation',
    'generation',
    3,
    'in_progress',
    '{"gap_analysis": {"priority_skills": ["tensorflow", "pytorch", "ml_ops"]}, "timeline_weeks": 12}'::jsonb,
    '{"courses_identified": 8, "certification_paths": 3, "project_recommendations": 5}'::jsonb,
    0.91,
    now() - interval '1 day',
    NULL
  );

-- Create Maya decisions for test user
INSERT INTO public.maya_decisions (user_id, decision_type, decision_context, recommended_action, confidence_score, reasoning, impact_score, status, auto_approved)
VALUES 
  (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'skill_prioritization',
    '{"current_goal": "ml_engineer", "market_demand": 92, "user_progress": 35}'::jsonb,
    '{"action": "prioritize_tensorflow", "timeline": "4_weeks", "resources": ["course_tensorflow_cert", "project_ml_pipeline"]}'::jsonb,
    0.87,
    'Market analysis shows 23% increase in TensorFlow demand. User has strong Python foundation, making this the optimal next skill.',
    0.92,
    'approved',
    false
  ),
  (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'course_recommendation',
    '{"skill_gap": "ml_ops", "urgency": "medium", "budget_preference": "free"}'::jsonb,
    '{"action": "enroll_course", "course_id": "ml_ops_fundamentals", "platform": "coursera", "duration_weeks": 6}'::jsonb,
    0.91,
    'MLOps skills are increasingly critical for ML engineer roles. Free Coursera course aligns with budget constraints.',
    0.78,
    'pending',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'market_opportunity',
    '{"location": "remote", "salary_increase": 15000, "demand_spike": true}'::jsonb,
    '{"action": "accelerate_timeline", "new_target": "4_months", "focus_areas": ["ml_engineering", "data_pipelines"]}'::jsonb,
    0.83,
    'Remote ML engineering roles show 34% salary increase. Accelerating timeline could capitalize on current market conditions.',
    0.89,
    'pending',
    false
  );

-- Create market alerts for test user (with explicit goal_id)
INSERT INTO public.goal_market_alerts (user_id, goal_id, alert_type, severity, market_data, alert_message, action_items, status)
VALUES 
  (
    '00000000-0000-0000-0000-000000000001'::uuid,
    (SELECT id FROM career_goals WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid AND active = true LIMIT 1),
    'demand_spike',
    'high',
    '{"field": "machine_learning", "growth_rate": 23.4, "salary_increase": 15000, "job_postings_increase": 67}'::jsonb,
    'Machine Learning Engineer demand surged 23.4% this month with average salary increase of $15K',
    '["accelerate_skill_development", "apply_for_positions", "update_resume_keywords"]'::jsonb,
    'active'
  ),
  (
    '00000000-0000-0000-0000-000000000001'::uuid,
    (SELECT id FROM career_goals WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid AND active = true LIMIT 1),
    'skill_obsolescence',
    'medium',
    '{"skill": "traditional_analytics", "decline_rate": -12, "replacement_skills": ["ml_analytics", "ai_insights"]}'::jsonb,
    'Traditional analytics skills declining 12%. Focus on ML-powered analytics for future-proofing',
    '["upskill_ml_analytics", "learn_ai_tools", "practice_ml_projects"]'::jsonb,
    'active'
  );

-- Create additional career monitoring alerts
INSERT INTO public.career_monitoring_alerts (user_id, title, description, alert_type, category, severity, trigger_data, recommended_actions, status)
VALUES 
  (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Market Opportunity: Remote ML Roles',
    'Significant increase in remote Machine Learning Engineer positions with competitive salaries',
    'market_opportunity',
    'career_advancement',
    'high',
    '{"remote_positions_increase": 45, "avg_salary_boost": 18000, "top_companies": ["TechCorp", "DataInc", "AIStudio"]}'::jsonb,
    '[{"action": "update_resume", "priority": "high"}, {"action": "apply_positions", "priority": "medium"}, {"action": "network_companies", "priority": "medium"}]'::jsonb,
    'active'
  ),
  (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Skill Development: PyTorch Trending',
    'PyTorch skills showing strong market demand - 67% increase in job requirements',
    'skill_alert',
    'skill_development',
    'medium',
    '{"skill": "pytorch", "demand_increase": 67, "difficulty": "intermediate", "learning_time_weeks": 8}'::jsonb,
    '[{"action": "enroll_pytorch_course", "priority": "high"}, {"action": "build_pytorch_project", "priority": "medium"}]'::jsonb,
    'active'
  );

-- Update autonomous workflow progress based on completed steps
UPDATE public.autonomous_workflows 
SET 
  progress_percentage = 65,
  last_action_at = now(),
  updated_at = now()
WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid;