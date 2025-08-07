-- Step 1: Seed System Performance Metrics with correct schema
INSERT INTO public.system_performance_metrics (metric_type, metric_name, metric_value, target_value, recorded_at) VALUES
('system', 'overall_health_score', 95.2, 90.0, now()),
('performance', 'maya_response_time', 850, 1000, now()),
('automation', 'automation_success_rate', 88.5, 85.0, now()),
('system', 'uptime_percentage', 99.7, 99.0, now()),
('security', 'vulnerability_score', 2, 5, now()),
('performance', 'system_load', 68.3, 80.0, now()),
('performance', 'memory_usage', 72.1, 85.0, now()),
('performance', 'database_response_time', 45, 100, now());

-- Step 2: Seed Maya Decisions for the dev user with decision_rationale
INSERT INTO public.maya_decisions (user_id, decision_type, decision_context, decision_rationale, confidence_score, created_at) VALUES
('2b458624-d498-4cca-a63d-9341cc20e363', 'career_pivot_recommendation', 
 jsonb_build_object(
   'current_role', 'Software Engineer',
   'recommended_pivot', 'Senior Full Stack Developer',
   'market_data', jsonb_build_object('demand_score', 87, 'salary_increase', 25)
 ),
 'Strong technical foundation with leadership potential makes this a strategic career move',
 0.92, now() - interval '1 day'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'skill_gap_analysis',
 jsonb_build_object(
   'identified_gaps', ARRAY['System Design', 'Team Leadership'],
   'priority_skills', ARRAY['Architecture Patterns', 'Project Management'],
   'learning_path', 'Enterprise Architecture Track'
 ),
 'Analysis based on current skills and target role requirements in market',
 0.88, now() - interval '2 days'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'market_opportunity',
 jsonb_build_object(
   'opportunity_type', 'Remote Senior Role',
   'location_advantage', 'San Francisco Bay Area',
   'timing_score', 92,
   'competition_level', 'medium'
 ),
 'Market analysis shows high demand for senior engineers with current skill set',
 0.85, now() - interval '3 days'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'learning_optimization',
 jsonb_build_object(
   'current_progress', 78,
   'optimal_schedule', '3 hours per week',
   'focus_areas', ARRAY['React Advanced Patterns', 'TypeScript'],
   'completion_prediction', '6 weeks'
 ),
 'Optimized learning path based on current progress and available time',
 0.90, now() - interval '4 days'),
('2b458624-d498-4cca-a63d-9341cc20e363', 'certification_priority',
 jsonb_build_object(
   'recommended_cert', 'AWS Solutions Architect',
   'roi_score', 94,
   'time_investment', '3 months',
   'market_value_increase', 18
 ),
 'High ROI certification aligned with market demand and career trajectory',
 0.87, now() - interval '5 days');