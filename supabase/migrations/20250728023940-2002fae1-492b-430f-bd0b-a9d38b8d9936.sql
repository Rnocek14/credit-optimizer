-- Fix user_id constraint to allow anonymous recommendations
ALTER TABLE public.personalized_recommendations ALTER COLUMN user_id DROP NOT NULL;

-- Insert sample recommendations to populate the system
INSERT INTO public.personalized_recommendations (
  user_id, 
  career_path, 
  location, 
  recommendation_type, 
  title, 
  description, 
  priority, 
  effort_required, 
  timeline, 
  impact_score,
  action_items,
  success_indicators
) VALUES
(
  NULL, -- anonymous recommendations
  'Software Engineer',
  'San Francisco, CA',
  'skill_development',
  'Learn Cloud Technologies',
  'Cloud computing skills are in high demand. Focus on AWS or Azure certifications to boost your marketability.',
  'high',
  'medium',
  '3-6 months',
  9,
  '["Complete AWS Solutions Architect certification", "Build 2-3 cloud projects", "Join cloud computing communities"]',
  '["Certification completion", "Portfolio projects deployed", "Job applications with cloud requirements"]'
),
(
  NULL,
  'Data Scientist',
  'New York, NY',
  'market_timing',
  'Optimal Market Entry Window',
  'Current market conditions show peak demand for data scientists. Consider making career moves within the next 6 months.',
  'high',
  'low',
  '1-6 months',
  8,
  '["Update resume with recent projects", "Network with hiring managers", "Apply to 10-15 target companies"]',
  '["Interview requests within 2 weeks", "Salary offers above market rate", "Multiple competing offers"]'
),
(
  NULL,
  'Product Manager',
  'Seattle, WA',
  'salary_optimization',
  'Salary Negotiation Strategy',
  'Tech companies in Seattle are offering 15% above average for PM roles. Leverage this for better compensation.',
  'medium',
  'low',
  '2-4 weeks',
  7,
  '["Research current salary ranges", "Document achievements and metrics", "Practice negotiation scenarios"]',
  '["Salary increase of 10-15%", "Additional equity or benefits", "Performance bonus structure"]'
);