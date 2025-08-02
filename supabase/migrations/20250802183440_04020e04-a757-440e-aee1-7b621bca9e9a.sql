-- Insert demo data for Phase 5 preparation (only if workflow_steps table exists)

-- Insert workflow steps for existing workflow (if workflow_steps table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workflow_steps') THEN
    INSERT INTO public.workflow_steps (workflow_id, step_name, step_type, step_order, status, input_data, output_data, confidence_score, started_at, completed_at)
    SELECT 
      aw.id,
      step_data.step_name,
      step_data.step_type,
      step_data.step_order,
      step_data.status,
      step_data.input_data,
      step_data.output_data,
      step_data.confidence_score,
      step_data.started_at,
      step_data.completed_at
    FROM autonomous_workflows aw,
    (VALUES 
      ('Market Analysis', 'analysis', 1, 'completed'::text, '{"market_focus": "machine_learning", "location": "global"}'::jsonb, '{"demand_score": 92, "growth_rate": 15.3, "salary_trend": "increasing"}'::jsonb, 0.94, now() - interval '2 days', now() - interval '2 days' + interval '45 minutes'),
      ('Skill Gap Assessment', 'assessment', 2, 'completed'::text, '{"current_skills": ["python", "data_analysis"], "target_skills": ["machine_learning", "deep_learning"]}'::jsonb, '{"gap_score": 67, "priority_skills": ["tensorflow", "pytorch", "ml_ops"], "estimated_hours": 120}'::jsonb, 0.89, now() - interval '2 days' + interval '1 hour', now() - interval '1 day' + interval '30 minutes'),
      ('Learning Path Generation', 'generation', 3, 'in_progress'::text, '{"gap_analysis": {"priority_skills": ["tensorflow", "pytorch", "ml_ops"]}, "timeline_weeks": 12}'::jsonb, '{"courses_identified": 8, "certification_paths": 3, "project_recommendations": 5}'::jsonb, 0.91, now() - interval '1 day', NULL::timestamptz)
    ) AS step_data(step_name, step_type, step_order, status, input_data, output_data, confidence_score, started_at, completed_at)
    WHERE aw.user_id = '00000000-0000-0000-0000-000000000001'::uuid
    AND NOT EXISTS (
      SELECT 1 FROM workflow_steps ws 
      WHERE ws.workflow_id = aw.id AND ws.step_name = step_data.step_name
    );
  END IF;
END $$;

-- Insert Maya decisions for test user (if maya_decisions table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'maya_decisions') THEN
    INSERT INTO public.maya_decisions (user_id, decision_type, decision_context, recommended_action, confidence_score, reasoning, impact_score, status, auto_approved)
    SELECT * FROM (VALUES 
      ('00000000-0000-0000-0000-000000000001'::uuid, 'skill_prioritization', '{"current_goal": "ml_engineer", "market_demand": 92, "user_progress": 35}'::jsonb, '{"action": "prioritize_tensorflow", "timeline": "4_weeks", "resources": ["course_tensorflow_cert", "project_ml_pipeline"]}'::jsonb, 0.87, 'Market analysis shows 23% increase in TensorFlow demand. User has strong Python foundation, making this the optimal next skill.', 0.92, 'approved'::text, false),
      ('00000000-0000-0000-0000-000000000001'::uuid, 'course_recommendation', '{"skill_gap": "ml_ops", "urgency": "medium", "budget_preference": "free"}'::jsonb, '{"action": "enroll_course", "course_id": "ml_ops_fundamentals", "platform": "coursera", "duration_weeks": 6}'::jsonb, 0.91, 'MLOps skills are increasingly critical for ML engineer roles. Free Coursera course aligns with budget constraints.', 0.78, 'pending'::text, true),
      ('00000000-0000-0000-0000-000000000001'::uuid, 'market_opportunity', '{"location": "remote", "salary_increase": 15000, "demand_spike": true}'::jsonb, '{"action": "accelerate_timeline", "new_target": "4_months", "focus_areas": ["ml_engineering", "data_pipelines"]}'::jsonb, 0.83, 'Remote ML engineering roles show 34% salary increase. Accelerating timeline could capitalize on current market conditions.', 0.89, 'pending'::text, false)
    ) AS decisions
    WHERE NOT EXISTS (
      SELECT 1 FROM maya_decisions md 
      WHERE md.user_id = '00000000-0000-0000-0000-000000000001'::uuid 
      AND md.decision_type = decisions.decision_type
    );
  END IF;
END $$;

-- Insert market alerts (if goal_market_alerts table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'goal_market_alerts') THEN
    INSERT INTO public.goal_market_alerts (user_id, goal_id, alert_type, severity, market_data, alert_message, action_items, status)
    SELECT 
      '00000000-0000-0000-0000-000000000001'::uuid,
      cg.id,
      alert_data.alert_type,
      alert_data.severity,
      alert_data.market_data,
      alert_data.alert_message,
      alert_data.action_items,
      alert_data.status
    FROM career_goals cg,
    (VALUES 
      ('demand_spike', 'high'::text, '{"field": "machine_learning", "growth_rate": 23.4, "salary_increase": 15000, "job_postings_increase": 67}'::jsonb, 'Machine Learning Engineer demand surged 23.4% this month with average salary increase of $15K', '["accelerate_skill_development", "apply_for_positions", "update_resume_keywords"]'::jsonb, 'active'::text),
      ('skill_obsolescence', 'medium'::text, '{"skill": "traditional_analytics", "decline_rate": -12, "replacement_skills": ["ml_analytics", "ai_insights"]}'::jsonb, 'Traditional analytics skills declining 12%. Focus on ML-powered analytics for future-proofing', '["upskill_ml_analytics", "learn_ai_tools", "practice_ml_projects"]'::jsonb, 'active'::text)
    ) AS alert_data(alert_type, severity, market_data, alert_message, action_items, status)
    WHERE cg.user_id = '00000000-0000-0000-0000-000000000001'::uuid 
    AND cg.active = true
    AND NOT EXISTS (
      SELECT 1 FROM goal_market_alerts gma 
      WHERE gma.user_id = '00000000-0000-0000-0000-000000000001'::uuid 
      AND gma.alert_type = alert_data.alert_type
    )
    LIMIT 2;
  END IF;
END $$;

-- Create additional career monitoring alerts
INSERT INTO public.career_monitoring_alerts (user_id, title, description, alert_type, category, severity, trigger_data, recommended_actions, status)
SELECT * FROM (VALUES 
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Market Opportunity: Remote ML Roles', 'Significant increase in remote Machine Learning Engineer positions with competitive salaries', 'market_opportunity', 'career_advancement', 'high'::text, '{"remote_positions_increase": 45, "avg_salary_boost": 18000, "top_companies": ["TechCorp", "DataInc", "AIStudio"]}'::jsonb, '[{"action": "update_resume", "priority": "high"}, {"action": "apply_positions", "priority": "medium"}, {"action": "network_companies", "priority": "medium"}]'::jsonb, 'active'::text),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Skill Development: PyTorch Trending', 'PyTorch skills showing strong market demand - 67% increase in job requirements', 'skill_alert', 'skill_development', 'medium'::text, '{"skill": "pytorch", "demand_increase": 67, "difficulty": "intermediate", "learning_time_weeks": 8}'::jsonb, '[{"action": "enroll_pytorch_course", "priority": "high"}, {"action": "build_pytorch_project", "priority": "medium"}]'::jsonb, 'active'::text)
) AS alerts
WHERE NOT EXISTS (
  SELECT 1 FROM career_monitoring_alerts cma 
  WHERE cma.user_id = '00000000-0000-0000-0000-000000000001'::uuid 
  AND cma.title = alerts.title
);

-- Update autonomous workflow progress
UPDATE public.autonomous_workflows 
SET 
  progress_percentage = 65,
  last_action_at = now(),
  updated_at = now()
WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid;