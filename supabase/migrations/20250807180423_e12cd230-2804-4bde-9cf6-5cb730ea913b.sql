-- Create some mentor validation data for collaboration systems
INSERT INTO public.mentor_course_feedback (mentor_id, course_id, course_quality_rating, learning_outcome_rating, feedback_text)
VALUES 
  ('2b458624-d498-4cca-a63d-9341cc20e363', gen_random_uuid(), 4.5, 4.8, 'Excellent course structure and hands-on projects'),
  ('3c459625-e499-5ddb-b64d-a442dd21f474', gen_random_uuid(), 4.2, 4.6, 'Good content, could use more practical examples')
ON CONFLICT DO NOTHING;

-- Create additional Maya decisions for the dev users to boost validation count
INSERT INTO public.maya_decisions (user_id, decision_type, confidence_score, decision_data)
VALUES 
  ('2b458624-d498-4cca-a63d-9341cc20e363', 'career_pivot_recommendation', 0.92, 
   jsonb_build_object('recommended_path', 'senior_data_scientist', 'reasoning', 'Strong analytical skills and Python expertise', 'timeline_weeks', 24)),
  ('2b458624-d498-4cca-a63d-9341cc20e363', 'skill_gap_analysis', 0.88, 
   jsonb_build_object('missing_skills', ARRAY['advanced_ml', 'cloud_architecture'], 'priority_order', ARRAY[1, 2])),
  ('3c459625-e499-5ddb-b64d-a442dd21f474', 'market_opportunity_alert', 0.85, 
   jsonb_build_object('opportunity_type', 'remote_frontend_jobs', 'market_growth', 15.3, 'location', 'global')),
  ('3c459625-e499-5ddb-b64d-a442dd21f474', 'learning_path_optimization', 0.91, 
   jsonb_build_object('optimized_path', 'react_to_fullstack', 'estimated_completion', '18_weeks')),
  ('4d56a736-f5aa-6eec-c75e-b553ee32e585', 'certification_recommendation', 0.89, 
   jsonb_build_object('recommended_cert', 'aws_solutions_architect', 'roi_score', 8.7, 'market_demand', 'high')),
  ('4d56a736-f5aa-6eec-c75e-b553ee32e585', 'salary_negotiation_insights', 0.87, 
   jsonb_build_object('market_rate_range', '95000-125000', 'negotiation_points', ARRAY['cloud_expertise', 'leadership_experience']))
ON CONFLICT DO NOTHING;