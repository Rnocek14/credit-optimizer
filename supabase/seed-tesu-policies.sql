-- TESU Policy Seed Data
-- Run this after the school_scrape_jobs migration to pre-populate canonical policy data
-- Source: 2025-2026 TESU Undergraduate Catalog (accessed 2026-01-08)

-- Create a completed scrape job for TESU canonical data
INSERT INTO school_scrape_jobs (
  id,
  institution_code,
  target_urls,
  status,
  overall_confidence,
  extracted_data,
  created_at,
  reviewed_at
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'TESU',
  ARRAY[
    'https://tesu.smartcatalogiq.com/en/current/undergraduate-catalog/methods-of-learning-and-earning-credit/transfer-credit',
    'https://www.tesu.edu/tuition-financial-aid/tuition-fees/undergraduate.php',
    'https://tesu.smartcatalogiq.com/en/current/undergraduate-catalog/degree-programs-and-certificates/overview'
  ],
  'completed',
  98,
  '{
    "institution": "Thomas Edison State University",
    "institution_code": "TESU",
    "catalog_year": "2025-2026"
  }'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert canonical policy field extractions
INSERT INTO policy_field_extractions (job_id, field_path, extracted_value, confidence, source_quote, source_url, review_status, final_value) VALUES

-- Total Credits Required
('a0000000-0000-0000-0000-000000000001',
 'total_credits_required',
 '120'::jsonb,
 100,
 '120 credits are needed to earn a bachelor''s degree.',
 'https://tesu.smartcatalogiq.com/en/current/undergraduate-catalog/degree-programs-and-certificates/overview',
 'approved',
 '120'::jsonb),

-- Minimum Residency Credits
('a0000000-0000-0000-0000-000000000001',
 'residency_credits',
 '15'::jsonb,
 100,
 'Students who use Per Credit Tuition... must complete 15 credits via Thomas Edison State University online (OL), Guided Study (GS) or e-Pack (EP) courses. This requirement may be waived by paying the Edison Accelerate fee.',
 'https://www.tesu.edu/tuition-financial-aid/tuition-fees/undergraduate.php',
 'approved',
 '15'::jsonb),

-- Maximum ACE/NCCRS Credits
('a0000000-0000-0000-0000-000000000001',
 'max_ace_nccrs_credits',
 '90'::jsonb,
 100,
 'Maximum of 90 semester hours for a baccalaureate degree (and 45 for an associate degree) from NCCRS and ACE recommendations.',
 'https://tesu.smartcatalogiq.com/en/current/undergraduate-catalog/methods-of-learning-and-earning-credit/transfer-credit',
 'approved',
 '90'::jsonb),

-- Upper Division Requirement
('a0000000-0000-0000-0000-000000000001',
 'upper_division_required',
 '18'::jsonb,
 100,
 'Baccalaureate students must complete a minimum of 18 credits at the upper level (3000 level or higher) within the area of study, which includes the Capstone course.',
 'https://tesu.smartcatalogiq.com/en/current/undergraduate-catalog/university-policies-and-procedures/undergraduate-academic-policies/degree-policies/degree-requirements',
 'approved',
 '18'::jsonb),

-- Minimum Grade for Transfer
('a0000000-0000-0000-0000-000000000001',
 'minimum_transfer_grade',
 '"D"'::jsonb,
 100,
 'Students may transfer in or apply TESU course grades of D to non-area-of-study requirements if their overall GPA is at least 2.0, with the following exceptions: All area of study courses must be graded C or better; All required composition courses must be graded C or better; No course in which a student earned a D- grade will be accepted in transfer.',
 'https://www.tesu.edu/academics/catalog/policy-on-grading',
 'approved',
 '"D"'::jsonb),

-- Required In-House Courses (Cornerstone)
('a0000000-0000-0000-0000-000000000001',
 'required_courses.cornerstone',
 '"SOS-1100"'::jsonb,
 100,
 'All undergraduate (associate and bachelor''s degree-seeking) students will be required to complete SOS-1100... at TESU as an online course... TESU does not accept transfer credits toward completion of this requirement.',
 'https://tesu.smartcatalogiq.com/en/current/undergraduate-catalog/university-policies-and-procedures/undergraduate-academic-policies/degree-policies',
 'approved',
 '"SOS-1100"'::jsonb),

-- Required In-House Courses (Capstone)
('a0000000-0000-0000-0000-000000000001',
 'required_courses.capstone',
 'true'::jsonb,
 100,
 'In accordance with the University''s Transfer Credit Policy, students are required to complete their Capstone course solely through Thomas Edison State University.',
 'https://tesu.smartcatalogiq.com/en/current/undergraduate-catalog/university-policies-and-procedures/undergraduate-academic-policies/degree-policies/undergraduate-capstone-policy',
 'approved',
 'true'::jsonb),

-- CLEP Acceptance
('a0000000-0000-0000-0000-000000000001',
 'exam_credits.clep_accepted',
 'true'::jsonb,
 100,
 'Thomas Edison State University awards credit for CLEP® examinations, which have been reviewed and recommended for college credit by the American Council on Education (ACE)...',
 'https://tesu.smartcatalogiq.com/en/current/undergraduate-catalog/methods-of-learning-and-earning-credit/exam-programs/clep-college-level-examination-program',
 'approved',
 'true'::jsonb),

-- DSST Acceptance
('a0000000-0000-0000-0000-000000000001',
 'exam_credits.dsst_accepted',
 'true'::jsonb,
 100,
 'Thomas Edison State University awards credit for DSST® examinations that have been reviewed and recommended for credit by the American Council on Education (ACE) for specific exhibit dates...',
 'https://tesu.smartcatalogiq.com/en/current/undergraduate-catalog/methods-of-learning-and-earning-credit/exam-programs/dsst-exams',
 'approved',
 'true'::jsonb),

-- Sophia Transcript Requirement
('a0000000-0000-0000-0000-000000000001',
 'provider_requirements.sophia',
 '{"transcript_source": "Credly", "notes": "We cannot review Sophia transcripts sent directly from Sophia, LLC"}'::jsonb,
 100,
 'TESU requires a Credly transcript for ACE-reviewed courses... Sophia courses are recommended for credit by ACE and Sophia courses must come to TESU on a Credly transcript... We cannot review Sophia transcripts sent directly from Sophia, LLC',
 'https://www.tesu.edu/student-resources/transfer-credits/send-transcripts.php',
 'approved',
 '{"transcript_source": "Credly", "notes": "We cannot review Sophia transcripts sent directly from Sophia, LLC"}'::jsonb),

-- Study.com Transcript Requirement
('a0000000-0000-0000-0000-000000000001',
 'provider_requirements.studycom',
 '{"transcript_source": "Study.com direct", "notes": "We will not accept the credit from the ACE transcript, only the Study.com transcript is acceptable for credit review"}'::jsonb,
 100,
 'Study.com and StraighterLine will send official transcripts directly to TESU (per agreement). To be official, transcripts must come directly from those organizations. For Study.com, we will not accept the credit from the ACE transcript, only the Study.com transcript is acceptable for credit review.',
 'https://www.tesu.edu/student-resources/transfer-credits/send-transcripts.php',
 'approved',
 '{"transcript_source": "Study.com direct", "notes": "We will not accept the credit from the ACE transcript, only the Study.com transcript is acceptable for credit review"}'::jsonb),

-- BSBA Currency Limitation
('a0000000-0000-0000-0000-000000000001',
 'program_exceptions.bsba_currency',
 '{"area_of_study_max_age_years": 10, "capstone_max_age_years": 5}'::jsonb,
 95,
 'For BSBA degree programs, 50% of the area of study courses may be older than 10 years from the most current date of application, but the remaining area of study credits must be completed within 10 years. The Business Administration Capstone course has a currency limitation of no more than five years; if the course is older than five years, students are required to retake the current version of the course.',
 'https://tesu.smartcatalogiq.com/en/current/undergraduate-catalog/university-policies-and-procedures/undergraduate-academic-policies/degree-policies/degree-requirements',
 'approved',
 '{"area_of_study_max_age_years": 10, "capstone_max_age_years": 5}'::jsonb)

ON CONFLICT DO NOTHING;

-- Verify seed data
SELECT 
  'Seeded ' || COUNT(*) || ' policy field extractions for TESU' AS result
FROM policy_field_extractions 
WHERE job_id = 'a0000000-0000-0000-0000-000000000001';
