-- Create missing skills and seed user progress data

-- Insert all required skills first
INSERT INTO skills (name, slug, category, description, difficulty_level, xp_value) VALUES
-- UX/Design skills for Aisha Khan
('UX Fundamentals', 'ux-fundamentals', 'Design', 'Core principles of user experience design', 2, 100),
('Wireframing', 'wireframing', 'Design', 'Creating low-fidelity mockups and layouts', 2, 100),
('Figma', 'figma', 'Design', 'Design and prototyping in Figma', 3, 100),
('Empathy', 'empathy', 'Design', 'Understanding and designing for user needs', 1, 100),
('Accessibility', 'accessibility', 'Design', 'Designing for users with disabilities', 3, 100),
('Interaction Design', 'interaction-design', 'Design', 'Designing interactive user interfaces', 4, 100),
('Advanced Prototyping', 'advanced-prototyping', 'Design', 'High-fidelity interactive prototypes', 5, 100),

-- Frontend skills for Mateo Silva  
('Git', 'git', 'DevOps', 'Version control with Git', 2, 100),
('React Basics', 'react-basics', 'Framework', 'Introduction to React fundamentals', 3, 100),
('Tailwind', 'tailwind', 'Styling', 'Utility-first CSS framework', 2, 100),
('Responsive Design', 'responsive-design', 'Design', 'Creating mobile-friendly layouts', 3, 100),
('APIs', 'apis', 'API', 'Working with REST APIs', 3, 100),
('Advanced React', 'advanced-react', 'Framework', 'Advanced React patterns and hooks', 5, 100),
('Web Performance', 'web-performance', 'Quality', 'Optimizing web application performance', 4, 100),

-- Product Management skills for Jade Chen
('Roadmapping', 'roadmapping', 'Product', 'Creating product roadmaps and strategy', 3, 100),
('Agile', 'agile', 'Product', 'Agile methodologies and practices', 2, 100),
('MVP Strategy', 'mvp-strategy', 'Product', 'Minimum viable product planning', 3, 100),
('Stakeholder Communication', 'stakeholder-communication', 'Product', 'Managing stakeholder relationships', 2, 100),
('Jira', 'jira', 'Product', 'Project management with Jira', 2, 100),
('Data Analysis', 'data-analysis', 'Product', 'Analyzing product data and metrics', 4, 100),
('Prioritization', 'prioritization', 'Product', 'Feature and task prioritization', 3, 100),
('Growth Hacking', 'growth-hacking', 'Product', 'Growth strategies and optimization', 4, 100),
('Market Sizing', 'market-sizing', 'Product', 'Market analysis and sizing techniques', 4, 100)
ON CONFLICT (slug) DO NOTHING;