-- Insert Jordan Reyes profile for testing
INSERT INTO public.profiles (
  name, experience_level, years_experience, role_title, industry, skills, 
  education, career_goals, interests, learning_style, availability, 
  location, willing_to_relocate, salary_expectations, work_preferences
) VALUES (
  'Jordan Reyes',
  'Intermediate', 
  4,
  'UX Designer',
  'Design',
  ARRAY['Figma', 'Adobe XD', 'User Research', 'Wireframing', 'Prototyping'],
  'Bachelor''s in Human-Computer Interaction',
  'Lead design teams and build accessible, user-centered products',
  ARRAY['Accessibility', 'Design Systems', 'Product Strategy'],
  'Project-based',
  '10 hours/week',
  'Austin, TX',
  false,
  105000,
  'Hybrid'
) RETURNING id;