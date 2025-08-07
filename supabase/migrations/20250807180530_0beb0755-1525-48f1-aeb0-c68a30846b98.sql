-- Create additional Maya decisions with correct column names
INSERT INTO public.maya_decisions (user_id, decision_type, confidence_score, context_data)
VALUES 
  ('2b458624-d498-4cca-a63d-9341cc20e363', 'career_pivot_recommendation', 0.92, 
   jsonb_build_object('recommended_path', 'senior_data_scientist', 'reasoning', 'Strong analytical skills', 'timeline_weeks', 24)),
  ('2b458624-d498-4cca-a63d-9341cc20e363', 'skill_gap_analysis', 0.88, 
   jsonb_build_object('missing_skills', ARRAY['advanced_ml', 'cloud_architecture'], 'priority_order', ARRAY[1, 2])),
  ('2b458624-d498-4cca-a63d-9341cc20e363', 'learning_optimization', 0.95, 
   jsonb_build_object('optimization_type', 'time_efficiency', 'recommended_schedule', '3_hours_daily')),
  ('3c459625-e499-5ddb-b64d-a442dd21f474', 'market_opportunity_alert', 0.85, 
   jsonb_build_object('opportunity_type', 'remote_frontend_jobs', 'market_growth', 15.3, 'location', 'global')),
  ('3c459625-e499-5ddb-b64d-a442dd21f474', 'learning_path_optimization', 0.91, 
   jsonb_build_object('optimized_path', 'react_to_fullstack', 'estimated_completion', '18_weeks')),
  ('3c459625-e499-5ddb-b64d-a442dd21f474', 'certification_priority', 0.89, 
   jsonb_build_object('top_cert', 'aws_cloud_practitioner', 'priority_score', 9.2)),
  ('4d56a736-f5aa-6eec-c75e-b553ee32e585', 'certification_recommendation', 0.89, 
   jsonb_build_object('recommended_cert', 'aws_solutions_architect', 'roi_score', 8.7, 'market_demand', 'high')),
  ('4d56a736-f5aa-6eec-c75e-b553ee32e585', 'salary_negotiation_insights', 0.87, 
   jsonb_build_object('market_rate_range', '95000-125000', 'negotiation_points', ARRAY['cloud_expertise', 'leadership_experience'])),
  ('4d56a736-f5aa-6eec-c75e-b553ee32e585', 'career_acceleration', 0.93, 
   jsonb_build_object('acceleration_path', 'technical_leadership', 'timeline_months', 12))
ON CONFLICT DO NOTHING;

-- Create collaboration workflow validations directly
INSERT INTO public.workflow_validations (user_id, source_type, source_id, validation_score, confidence_score, validation_data)
VALUES 
  ('2b458624-d498-4cca-a63d-9341cc20e363', 'collaboration_mentor', gen_random_uuid(), 88.5, 0.85, 
   jsonb_build_object('mentor_feedback', 'excellent_collaboration', 'sessions_completed', 3, 'quality_score', 4.8)),
  ('3c459625-e499-5ddb-b64d-a442dd21f474', 'collaboration_mentor', gen_random_uuid(), 82.3, 0.82, 
   jsonb_build_object('mentor_feedback', 'good_progress', 'sessions_completed', 2, 'quality_score', 4.2)),
  ('4d56a736-f5aa-6eec-c75e-b553ee32e585', 'collaboration_peer', gen_random_uuid(), 90.1, 0.90, 
   jsonb_build_object('peer_collaboration', 'active_contributor', 'projects_completed', 2, 'team_rating', 4.5))
ON CONFLICT DO NOTHING;