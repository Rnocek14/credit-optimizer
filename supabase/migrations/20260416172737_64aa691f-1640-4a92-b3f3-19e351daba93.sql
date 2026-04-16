-- WGU catalog seed (representative competency-based courses)
-- WGU uses C### or D### course codes for individual competency assessments.
-- These cover the most common gen-ed and CS/IT competencies that map to alt-credit providers.

INSERT INTO edu_courses (institution_code, code, code_norm, title, credits, level_year, area)
VALUES
  -- General Education / Foundations
  ('WGU', 'C955', 'C955', 'Applied Probability and Statistics', 3, 1, 'Mathematics'),
  ('WGU', 'C957', 'C957', 'Applied Algebra', 3, 1, 'Mathematics'),
  ('WGU', 'C278', 'C278', 'College Algebra', 3, 1, 'Mathematics'),
  ('WGU', 'D265', 'D265', 'Critical Thinking: Reason and Evidence', 3, 1, 'General Education'),
  ('WGU', 'D266', 'D266', 'World History: Diverse Cultures and Global Connections', 3, 1, 'History'),
  ('WGU', 'D268', 'D268', 'Introduction to Communication', 3, 1, 'Communications'),
  ('WGU', 'D269', 'D269', 'Composition: Writing with a Strategy', 3, 1, 'English'),
  ('WGU', 'D270', 'D270', 'Composition: Successful Self-Expression', 3, 1, 'English'),
  ('WGU', 'D272', 'D272', 'Survey of United States History', 3, 1, 'History'),
  ('WGU', 'D275', 'D275', 'Introduction to Geography', 3, 1, 'Geography'),
  ('WGU', 'D199', 'D199', 'Introduction to Physical and Human Geography', 3, 1, 'Geography'),
  ('WGU', 'D331', 'D331', 'American Politics and the U.S. Constitution', 3, 1, 'Political Science'),
  ('WGU', 'C100', 'C100', 'Introduction to Humanities', 3, 1, 'Humanities'),
  ('WGU', 'D333', 'D333', 'Ethics in Technology', 3, 2, 'Philosophy'),

  -- Sciences
  ('WGU', 'C683', 'C683', 'Natural Science Lab', 3, 1, 'Science'),
  ('WGU', 'D283', 'D283', 'Foundations in Biological Sciences', 3, 1, 'Biology'),
  ('WGU', 'D376', 'D376', 'General Chemistry I', 3, 1, 'Chemistry'),

  -- Psychology / Sociology
  ('WGU', 'D094', 'D094', 'Educational Psychology', 3, 1, 'Psychology'),
  ('WGU', 'C181', 'C181', 'Survey of United States Constitution and Government', 3, 1, 'Political Science'),

  -- IT / Computer Science core
  ('WGU', 'C779', 'C779', 'Web Development Foundations', 3, 1, 'Computer Science'),
  ('WGU', 'C173', 'C173', 'Scripting and Programming - Foundations', 3, 1, 'Computer Science'),
  ('WGU', 'C175', 'C175', 'Data Management - Foundations', 3, 1, 'Computer Science'),
  ('WGU', 'C176', 'C176', 'Business of IT - Project Management', 3, 2, 'Computer Science'),
  ('WGU', 'C182', 'C182', 'Introduction to IT', 4, 1, 'Computer Science'),
  ('WGU', 'C195', 'C195', 'Software II - Advanced Java Concepts', 4, 3, 'Computer Science'),
  ('WGU', 'C170', 'C170', 'Data Management - Applications', 4, 2, 'Computer Science'),
  ('WGU', 'C172', 'C172', 'Network and Security - Foundations', 3, 1, 'Computer Science'),
  ('WGU', 'C394', 'C394', 'IT Foundations', 4, 1, 'Computer Science'),
  ('WGU', 'C846', 'C846', 'Business of IT - Applications', 4, 2, 'Computer Science'),
  ('WGU', 'D426', 'D426', 'Data Management - Foundations', 3, 1, 'Computer Science'),
  ('WGU', 'D427', 'D427', 'Data Management - Applications', 4, 2, 'Computer Science'),

  -- Business / Accounting
  ('WGU', 'C211', 'C211', 'Global Business', 3, 2, 'Business'),
  ('WGU', 'C212', 'C212', 'Marketing', 3, 2, 'Business'),
  ('WGU', 'C213', 'C213', 'Accounting for Decision Makers', 3, 2, 'Accounting'),
  ('WGU', 'C214', 'C214', 'Financial Management', 3, 3, 'Business'),
  ('WGU', 'C215', 'C215', 'Operations Management', 3, 3, 'Business'),
  ('WGU', 'C232', 'C232', 'Introduction to Human Resource Management', 3, 2, 'Business'),
  ('WGU', 'D196', 'D196', 'Principles of Financial and Managerial Accounting', 4, 2, 'Accounting'),
  ('WGU', 'D072', 'D072', 'Fundamentals for Success in Business', 3, 1, 'Business'),
  ('WGU', 'D078', 'D078', 'Business Environment Applications I', 3, 1, 'Business'),
  ('WGU', 'D080', 'D080', 'Managing in a Global Business Environment', 3, 2, 'Business'),
  ('WGU', 'D081', 'D081', 'Innovative and Strategic Thinking', 3, 3, 'Business'),
  ('WGU', 'D082', 'D082', 'Emotional and Cultural Intelligence', 3, 2, 'Business')
ON CONFLICT (institution_code, code_norm) DO UPDATE SET
  title = EXCLUDED.title,
  credits = EXCLUDED.credits,
  level_year = EXCLUDED.level_year,
  area = EXCLUDED.area,
  updated_at = now();