-- Create test data for the test user in career_goals table
INSERT INTO public.career_goals (
  id,
  user_id,
  title,
  description,
  target_role,
  skill_gaps,
  current_progress,
  market_demand_score,
  priority_score,
  estimated_timeline_weeks,
  target_date,
  active
) VALUES 
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'Complete JavaScript Fundamentals',
    'Master the core concepts of JavaScript programming including variables, functions, objects, and DOM manipulation',
    'Frontend Developer',
    ARRAY['JavaScript', 'DOM Manipulation', 'ES6+', 'Async Programming'],
    25,
    85,
    92,
    8,
    (CURRENT_DATE + INTERVAL '8 weeks')::date,
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'Learn React.js Framework',
    'Build modern web applications using React.js, including hooks, state management, and component architecture',
    'React Developer',
    ARRAY['React.js', 'JSX', 'React Hooks', 'State Management'],
    10,
    90,
    88,
    12,
    (CURRENT_DATE + INTERVAL '12 weeks')::date,
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'Build Portfolio Projects',
    'Create 3-5 portfolio projects showcasing full-stack development skills',
    'Full Stack Developer',
    ARRAY['Project Planning', 'Git/GitHub', 'Deployment', 'API Integration'],
    5,
    75,
    85,
    16,
    (CURRENT_DATE + INTERVAL '16 weeks')::date,
    true
  ),
  (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'Master Database Design',
    'Learn SQL, database design principles, and work with both relational and NoSQL databases',
    'Backend Developer',
    ARRAY['SQL', 'Database Design', 'PostgreSQL', 'MongoDB'],
    0,
    70,
    75,
    20,
    (CURRENT_DATE + INTERVAL '20 weeks')::date,
    true
  )
ON CONFLICT (id) DO NOTHING;