-- Insert test profile data for Alice Test
INSERT INTO public.profiles (
  name,
  experience_level,
  role_title,
  industry,
  skills,
  education,
  years_experience,
  career_goals,
  interests,
  learning_style,
  availability,
  location,
  willing_to_relocate,
  salary_expectations,
  work_preferences
) VALUES (
  'Alice Test',
  'beginner',
  'Graphic Designer',
  'Design',
  ARRAY['Figma', 'Photoshop', 'Illustrator'],
  'BA in Graphic Design',
  2,
  'Become a UX Designer at a product company',
  ARRAY['User Experience', 'Mobile Apps'],
  'Project-based',
  '10 hours/week',
  'Remote',
  false,
  80000,
  'remote-first'
);