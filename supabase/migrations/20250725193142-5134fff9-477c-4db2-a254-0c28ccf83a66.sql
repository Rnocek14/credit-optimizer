-- Add missing career path entries to ensure market_trends data has corresponding career_paths
INSERT INTO career_paths (title, summary, industry, level, growth_outlook, track)
VALUES 
  ('Nurse Practitioner', 'Advanced practice registered nurse providing primary healthcare services', 'Healthcare', 'Senior', 'High', 'healthcare'),
  ('Blockchain Developer', 'Software developer specializing in blockchain technology and decentralized applications', 'Technology', 'Senior', 'High', 'technology');