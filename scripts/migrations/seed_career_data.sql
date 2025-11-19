-- =====================================================
-- Seed Career Paths Test Data
-- Run this to create sample careers for testing
-- =====================================================

-- Create career_paths table if it doesn't exist
CREATE TABLE IF NOT EXISTS career_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT,
  summary TEXT,
  average_salary INT,
  baseline_salary INT,
  industry TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Clear existing test data (optional)
-- DELETE FROM career_paths WHERE slug IN ('software-engineer', 'data-analyst', 'cybersecurity-analyst');

-- Insert test careers
INSERT INTO career_paths (title, slug, summary, average_salary, baseline_salary, industry)
VALUES
  (
    'Software Engineer',
    'software-engineer',
    'Design, develop, and maintain software applications and systems. Work with modern programming languages, frameworks, and development tools.',
    95000,
    45000,
    'Technology'
  ),
  (
    'Data Analyst',
    'data-analyst',
    'Analyze complex datasets to derive actionable insights. Use statistical methods, data visualization, and business intelligence tools.',
    75000,
    42000,
    'Technology'
  ),
  (
    'Cybersecurity Analyst',
    'cybersecurity-analyst',
    'Protect organizational systems and data from cyber threats. Monitor security infrastructure, respond to incidents, and implement security measures.',
    88000,
    48000,
    'Technology'
  )
ON CONFLICT (id) DO NOTHING;

-- Verify the data
SELECT 
  id,
  title,
  slug,
  average_salary,
  baseline_salary,
  industry
FROM career_paths
ORDER BY title;

-- Show which careers have program mappings
SELECT 
  cp.title as career,
  COUNT(cpp.id) as mapped_programs
FROM career_paths cp
LEFT JOIN career_path_programs cpp ON cpp.career_path_id = cp.id
GROUP BY cp.id, cp.title
ORDER BY cp.title;
