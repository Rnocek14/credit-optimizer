-- Insert sample skill automation risk data
INSERT INTO public.skill_automation_risk (skill_id, risk_percentage, risk_factors, last_updated) VALUES
('550e8400-e29b-41d4-a716-446655440001', 15.5, '["High creativity demand", "Complex problem solving", "Human interaction critical"]', now()),
('550e8400-e29b-41d4-a716-446655440002', 65.2, '["Repetitive tasks", "Rule-based processing", "Limited creativity required"]', now()),
('550e8400-e29b-41d4-a716-446655440003', 25.8, '["Strategic thinking", "Leadership skills", "Adaptability required"]', now()),
('550e8400-e29b-41d4-a716-446655440004', 45.3, '["Data processing", "Pattern recognition", "Some automation possible"]', now()),
('550e8400-e29b-41d4-a716-446655440005', 35.7, '["Technical expertise", "Problem diagnosis", "Human judgment needed"]', now());

-- Insert sample age penalty curves
INSERT INTO public.age_penalty_curves (age_min, age_max, penalty_factor, notes) VALUES
(18, 25, 0.9, 'Young professionals - slight advantage in learning new technologies'),
(26, 35, 1.0, 'Prime career transition age - no penalty'),
(36, 45, 1.15, 'Mid-career - slight penalty due to established patterns'),
(46, 55, 1.35, 'Later career - higher penalty due to industry ageism'),
(56, 65, 1.6, 'Senior career - significant penalty in tech-heavy transitions');

-- Create sample switching scenario
INSERT INTO public.switching_scenarios (
  user_id, 
  from_career_path, 
  to_career_path, 
  scenario_assumptions, 
  calculated_metrics, 
  risk_assessment,
  scenario_name
) VALUES (
  '2b458624-d498-4cca-a63d-9341cc20e363', -- Sample user ID
  'Software Engineer',
  'Product Manager', 
  '{"current_salary": 95000, "target_salary": 110000, "location": "San Francisco", "years_experience": 5}',
  '{"skill_overlap": 60, "time_to_transition": 18, "switch_cost": 12000, "roi_3yr": 45000}',
  '{"overall_risk": 35, "automation_risk": 20, "age_factor": 1.0, "market_volatility": 25}',
  'Tech to Product Transition'
);