-- Add learning sessions with correct columns
INSERT INTO public.learning_sessions (
  user_id,
  node_id,
  node_title,
  start_time,
  end_time,
  duration_minutes,
  completion_rate,
  engagement_score,
  mastered_concepts,
  struggled_concepts,
  notes
) VALUES (
  '2b458624-d498-4cca-a63d-9341cc20e363',
  'js-fundamentals',
  'JavaScript Fundamentals',
  now() - interval '2 hours',
  now() - interval '1 hour 15 minutes',
  45,
  0.80,
  8.5,
  ARRAY['Template Literals', 'Let/Const Usage'],
  ARRAY['Arrow Functions', 'Destructuring'],
  'Great progress on template literals! Focus on arrow function syntax next.'
),
(
  '2b458624-d498-4cca-a63d-9341cc20e363',
  'react-development',
  'React Development',
  now() - interval '1 day',
  now() - interval '1 day' + interval '1 hour',
  60,
  0.60,
  9.2,
  ARRAY['JSX Syntax', 'Component Structure'],
  ARRAY['useState Hook', 'Event Handling'],
  'Good grasp of JSX! Spend more time on state management concepts.'
);