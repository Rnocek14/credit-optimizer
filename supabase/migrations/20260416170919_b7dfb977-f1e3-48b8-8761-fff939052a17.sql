-- Empire State University catalog seed (baseline subset)
-- Grounds Empire transfer rules in real catalog codes before ingesting Study.com / CLEP / Sophia mappings.
-- Following SOP: catalog FIRST, then verified rules, then supersede legacy.

INSERT INTO edu_courses (institution_code, code, code_norm, title, credits, level_year, area)
VALUES
  ('EMPIRE', 'ACCT 1005', 'ACCT1005', 'Principles of Financial Accounting', 4, 1, 'Accounting'),
  ('EMPIRE', 'ACCT 1015', 'ACCT1015', 'Principles of Managerial Accounting', 4, 1, 'Accounting'),
  ('EMPIRE', 'BME 1015', 'BME1015', 'Introduction to Business', 4, 1, 'Business'),
  ('EMPIRE', 'BME 2005', 'BME2005', 'Principles of Marketing', 4, 2, 'Business'),
  ('EMPIRE', 'BME 2015', 'BME2015', 'Principles of Management', 4, 2, 'Business'),
  ('EMPIRE', 'ECON 1005', 'ECON1005', 'Principles of Microeconomics', 4, 1, 'Economics'),
  ('EMPIRE', 'ECON 1015', 'ECON1015', 'Principles of Macroeconomics', 4, 1, 'Economics'),
  ('EMPIRE', 'ENGL 1005', 'ENGL1005', 'College Writing', 4, 1, 'English'),
  ('EMPIRE', 'ENGL 2005', 'ENGL2005', 'Introduction to Literature', 4, 2, 'English'),
  ('EMPIRE', 'HIST 1005', 'HIST1005', 'United States History I', 4, 1, 'History'),
  ('EMPIRE', 'HIST 1015', 'HIST1015', 'United States History II', 4, 1, 'History'),
  ('EMPIRE', 'MATH 1005', 'MATH1005', 'College Algebra', 4, 1, 'Mathematics'),
  ('EMPIRE', 'MATH 1015', 'MATH1015', 'Pre-Calculus', 4, 1, 'Mathematics'),
  ('EMPIRE', 'MATH 2005', 'MATH2005', 'Calculus I', 4, 2, 'Mathematics'),
  ('EMPIRE', 'MATH 2015', 'MATH2015', 'Statistics', 4, 2, 'Mathematics'),
  ('EMPIRE', 'PSYC 1005', 'PSYC1005', 'Introduction to Psychology', 4, 1, 'Psychology'),
  ('EMPIRE', 'PSYC 2005', 'PSYC2005', 'Developmental Psychology', 4, 2, 'Psychology'),
  ('EMPIRE', 'SOCI 1005', 'SOCI1005', 'Introduction to Sociology', 4, 1, 'Sociology'),
  ('EMPIRE', 'COMM 1005', 'COMM1005', 'Public Speaking', 4, 1, 'Communications'),
  ('EMPIRE', 'BIOL 1005', 'BIOL1005', 'General Biology I', 4, 1, 'Biology'),
  ('EMPIRE', 'BIOL 1015', 'BIOL1015', 'General Biology II', 4, 1, 'Biology'),
  ('EMPIRE', 'CHEM 1005', 'CHEM1005', 'General Chemistry I', 4, 1, 'Chemistry'),
  ('EMPIRE', 'PHYS 1005', 'PHYS1005', 'General Physics I', 4, 1, 'Physics'),
  ('EMPIRE', 'CSCI 1005', 'CSCI1005', 'Introduction to Computer Science', 4, 1, 'Computer Science'),
  ('EMPIRE', 'CSCI 2005', 'CSCI2005', 'Programming Fundamentals', 4, 2, 'Computer Science'),
  ('EMPIRE', 'PHIL 1005', 'PHIL1005', 'Introduction to Philosophy', 4, 1, 'Philosophy'),
  ('EMPIRE', 'PHIL 2005', 'PHIL2005', 'Ethics', 4, 2, 'Philosophy'),
  ('EMPIRE', 'POLI 1005', 'POLI1005', 'American Government', 4, 1, 'Political Science'),
  ('EMPIRE', 'ARTH 1005', 'ARTH1005', 'Art History I', 4, 1, 'Art'),
  ('EMPIRE', 'MUSI 1005', 'MUSI1005', 'Music Appreciation', 4, 1, 'Music'),
  ('EMPIRE', 'ACCT 3005', 'ACCT3005', 'Intermediate Accounting I', 4, 3, 'Accounting'),
  ('EMPIRE', 'BME 3005', 'BME3005', 'Organizational Behavior', 4, 3, 'Business'),
  ('EMPIRE', 'BME 3015', 'BME3015', 'Business Law', 4, 3, 'Business'),
  ('EMPIRE', 'BME 4005', 'BME4005', 'Strategic Management', 4, 4, 'Business'),
  ('EMPIRE', 'CSCI 3005', 'CSCI3005', 'Data Structures', 4, 3, 'Computer Science'),
  ('EMPIRE', 'CSCI 3015', 'CSCI3015', 'Database Systems', 4, 3, 'Computer Science'),
  ('EMPIRE', 'CSCI 4005', 'CSCI4005', 'Software Engineering', 4, 4, 'Computer Science')
ON CONFLICT (institution_code, code_norm) DO UPDATE SET
  title = EXCLUDED.title,
  credits = EXCLUDED.credits,
  level_year = EXCLUDED.level_year,
  area = EXCLUDED.area,
  updated_at = now();