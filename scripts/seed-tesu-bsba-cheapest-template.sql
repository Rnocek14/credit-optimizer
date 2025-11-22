-- ============================================================================
-- TESU BSBA "Cheapest" Degree Template
-- ============================================================================
-- Complete 120-credit degree plan optimized for lowest cost
-- 8 terms (4 years) with all requirement slots and alternatives
-- ============================================================================

INSERT INTO public.degree_templates (
  id,
  institution_id,
  institution_code,
  program_code,
  program_name,
  track_type,
  total_credits,
  estimated_cost,
  estimated_duration_months,
  template_data,
  catalog_year,
  policy_last_verified,
  notes
)
VALUES (
  'tesu-bsba-cheapest-2025',
  (SELECT id FROM public.institutions WHERE code = 'TESU'),
  'TESU',
  'BSBA',
  'Bachelor of Science in Business Administration',
  'cheapest',
  120,
  2850.00, -- Estimated total cost
  48, -- 4 years
  jsonb_build_object(
    'programCode', 'BSBA',
    'trackType', 'cheapest',
    'totalCredits', 120,
    'terms', jsonb_build_array(
      
      -- ====================================================================
      -- YEAR 1, TERM 1 (Fall) - 15 credits
      -- ====================================================================
      jsonb_build_object(
        'id', 'y1-t1',
        'label', 'Year 1, Term 1 (Fall)',
        'slots', jsonb_build_array(
          
          -- Slot 1: Written Communication I (3 cr)
          jsonb_build_object(
            'slotId', 'y1-t1-slot1',
            'requirementArea', 'WRITTEN_COMM',
            'kind', 'gened',
            'minCredits', 3,
            'preferred', jsonb_build_object(
              'type', 'alt_credit',
              'sourceCode', 'SOPHIA',
              'identifier', 'ENG-101'
            ),
            'alternatives', jsonb_build_array(
              jsonb_build_object(
                'type', 'alt_credit',
                'sourceCode', 'CLEP',
                'identifier', 'COLLEGE_COMPOSITION_MODULAR'
              )
            )
          ),
          
          -- Slot 2: Quantitative (3 cr)
          jsonb_build_object(
            'slotId', 'y1-t1-slot2',
            'requirementArea', 'QUANTITATIVE',
            'kind', 'gened',
            'minCredits', 3,
            'preferred', jsonb_build_object(
              'type', 'alt_credit',
              'sourceCode', 'SOPHIA',
              'identifier', 'MAT-101'
            ),
            'alternatives', jsonb_build_array(
              jsonb_build_object(
                'type', 'alt_credit',
                'sourceCode', 'CLEP',
                'identifier', 'COLLEGE_ALGEBRA'
              ),
              jsonb_build_object(
                'type', 'alt_credit',
                'sourceCode', 'DSST',
                'identifier', 'BUSINESS_MATH'
              )
            )
          ),
          
          -- Slot 3: Introduction to Psychology (3 cr)
          jsonb_build_object(
            'slotId', 'y1-t1-slot3',
            'requirementArea', 'SOCIAL_SCIENCE',
            'kind', 'gened',
            'minCredits', 3,
            'preferred', jsonb_build_object(
              'type', 'alt_credit',
              'sourceCode', 'SOPHIA',
              'identifier', 'PSY-101'
            ),
            'alternatives', jsonb_build_array(
              jsonb_build_object(
                'type', 'alt_credit',
                'sourceCode', 'CLEP',
                'identifier', 'INTRO_PSYCHOLOGY'
              )
            )
          ),
          
          -- Slot 4: Introduction to Business (3 cr)
          jsonb_build_object(
            'slotId', 'y1-t1-slot4',
            'requirementArea', 'BUS_CORE',
            'kind', 'major',
            'minCredits', 3,
            'preferred', jsonb_build_object(
              'type', 'alt_credit',
              'sourceCode', 'SOPHIA',
              'identifier', 'BUS-101'
            ),
            'alternatives', jsonb_build_array(
              jsonb_build_object(
                'type', 'alt_credit',
                'sourceCode', 'DSST',
                'identifier', 'INTRO_BUSINESS'
              )
            )
          ),
          
          -- Slot 5: Introduction to Sociology (3 cr)
          jsonb_build_object(
            'slotId', 'y1-t1-slot5',
            'requirementArea', 'SOCIAL_SCIENCE',
            'kind', 'gened',
            'minCredits', 3,
            'preferred', jsonb_build_object(
              'type', 'alt_credit',
              'sourceCode', 'SOPHIA',
              'identifier', 'SOC-101'
            ),
            'alternatives', jsonb_build_array(
              jsonb_build_object(
                'type', 'alt_credit',
                'sourceCode', 'CLEP',
                'identifier', 'INTRO_SOCIOLOGY'
              )
            )
          )
        )
      ),
      
      -- ====================================================================
      -- YEAR 1, TERM 2 (Spring) - 15 credits
      -- ====================================================================
      jsonb_build_object(
        'id', 'y1-t2',
        'label', 'Year 1, Term 2 (Spring)',
        'slots', jsonb_build_array(
          
          -- Slot 1: Written Communication II (3 cr)
          jsonb_build_object(
            'slotId', 'y1-t2-slot1',
            'requirementArea', 'WRITTEN_COMM',
            'kind', 'gened',
            'minCredits', 3,
            'preferred', jsonb_build_object(
              'type', 'alt_credit',
              'sourceCode', 'SOPHIA',
              'identifier', 'ENG-102'
            ),
            'alternatives', jsonb_build_array(
              jsonb_build_object(
                'type', 'alt_credit',
                'sourceCode', 'CLEP',
                'identifier', 'COLLEGE_COMPOSITION'
              )
            )
          ),
          
          -- Slot 2: Public Speaking (3 cr)
          jsonb_build_object(
            'slotId', 'y1-t2-slot2',
            'requirementArea', 'ORAL_COMM',
            'kind', 'gened',
            'minCredits', 3,
            'preferred', jsonb_build_object(
              'type', 'alt_credit',
              'sourceCode', 'SOPHIA',
              'identifier', 'COM-101'
            ),
            'alternatives', jsonb_build_array()
          ),
          
          -- Slot 3: Macroeconomics (3 cr)
          jsonb_build_object(
            'slotId', 'y1-t2-slot3',
            'requirementArea', 'SOCIAL_SCIENCE',
            'kind', 'gened',
            'minCredits', 3,
            'preferred', jsonb_build_object(
              'type', 'alt_credit',
              'sourceCode', 'SOPHIA',
              'identifier', 'ECO-101'
            ),
            'alternatives', jsonb_build_array()
          ),
          
          -- Slot 4: Microeconomics (3 cr)
          jsonb_build_object(
            'slotId', 'y1-t2-slot4',
            'requirementArea', 'SOCIAL_SCIENCE',
            'kind', 'gened',
            'minCredits', 3,
            'preferred', jsonb_build_object(
              'type', 'alt_credit',
              'sourceCode', 'SOPHIA',
              'identifier', 'ECO-102'
            ),
            'alternatives', jsonb_build_array()
          ),
          
          -- Slot 5: Environmental Science (3 cr)
          jsonb_build_object(
            'slotId', 'y1-t2-slot5',
            'requirementArea', 'NATURAL_SCIENCE',
            'kind', 'gened',
            'minCredits', 3,
            'preferred', jsonb_build_object(
              'type', 'alt_credit',
              'sourceCode', 'SOPHIA',
              'identifier', 'ENV-101'
            ),
            'alternatives', jsonb_build_array(
              jsonb_build_object(
                'type', 'alt_credit',
                'sourceCode', 'DSST',
                'identifier', 'ENVIRONMENTAL_SCIENCE'
              ),
              jsonb_build_object(
                'type', 'alt_credit',
                'sourceCode', 'CLEP',
                'identifier', 'NATURAL_SCIENCES'
              )
            )
          )
        )
      ),
      
      -- ====================================================================
      -- YEAR 2, TERM 1 (Fall) - 15 credits
      -- ====================================================================
      jsonb_build_object(
        'id', 'y2-t1',
        'label', 'Year 2, Term 1 (Fall)',
        'slots', jsonb_build_array(
          
          -- Slot 1: Humanities (3 cr)
          jsonb_build_object(
            'slotId', 'y2-t1-slot1',
            'requirementArea', 'HUMANITIES',
            'kind', 'gened',
            'minCredits', 3,
            'preferred', jsonb_build_object(
              'type', 'alt_credit',
              'sourceCode', 'SOPHIA',
              'identifier', 'PHI-101'
            ),
            'alternatives', jsonb_build_array(
              jsonb_build_object(
                'type', 'alt_credit',
                'sourceCode', 'DSST',
                'identifier', 'ART_WESTERN_WORLD'
              ),
              jsonb_build_object(
                'type', 'alt_credit',
                'sourceCode', 'CLEP',
                'identifier', 'HUMANITIES'
              )
            )
          ),
          
          -- Slot 2: American Government (Civic) (3 cr)
          jsonb_build_object(
            'slotId', 'y2-t1-slot2',
            'requirementArea', 'CIVIC_GLOBAL',
            'kind', 'gened',
            'minCredits', 3,
            'preferred', jsonb_build_object(
              'type', 'alt_credit',
              'sourceCode', 'SOPHIA',
              'identifier', 'POL-101'
            ),
            'alternatives', jsonb_build_array(
              jsonb_build_object(
                'type', 'alt_credit',
                'sourceCode', 'DSST',
                'identifier', 'ETHICS_AMERICA'
              )
            )
          ),
          
          -- Slot 3: Natural Science II (3 cr)
          jsonb_build_object(
            'slotId', 'y2-t1-slot3',
            'requirementArea', 'NATURAL_SCIENCE',
            'kind', 'gened',
            'minCredits', 3,
            'preferred', jsonb_build_object(
              'type', 'alt_credit',
              'sourceCode', 'CLEP',
              'identifier', 'BIOLOGY'
            ),
            'alternatives', jsonb_build_array(
              jsonb_build_object(
                'type', 'alt_credit',
                'sourceCode', 'CLEP',
                'identifier', 'NATURAL_SCIENCES'
              )
            )
          ),
          
          -- Slot 4: Business Communication (3 cr)
          jsonb_build_object(
            'slotId', 'y2-t1-slot4',
            'requirementArea', 'BUS_CORE',
            'kind', 'major',
            'minCredits', 3,
            'preferred', jsonb_build_object(
              'type', 'alt_credit',
              'sourceCode', 'SOPHIA',
              'identifier', 'BUS-210'
            ),
            'alternatives', jsonb_build_array()
          ),
          
          -- Slot 5: Business Statistics (3 cr)
          jsonb_build_object(
            'slotId', 'y2-t1-slot5',
            'requirementArea', 'BUS_CORE',
            'kind', 'major',
            'minCredits', 3,
            'preferred', jsonb_build_object(
              'type', 'alt_credit',
              'sourceCode', 'STUDY_COM',
              'identifier', 'BUS-204'
            ),
            'alternatives', jsonb_build_array(
              jsonb_build_object(
                'type', 'alt_credit',
                'sourceCode', 'SOPHIA',
                'identifier', 'MAT-121'
              )
            )
          )
        )
      ),
      
      -- ====================================================================
      -- YEAR 2, TERM 2 (Spring) - 15 credits
      -- ====================================================================
      jsonb_build_object(
        'id', 'y2-t2',
        'label', 'Year 2, Term 2 (Spring)',
        'slots', jsonb_build_array(
          
          -- Slot 1: Humanities II (3 cr)
          jsonb_build_object(
            'slotId', 'y2-t2-slot1',
            'requirementArea', 'HUMANITIES',
            'kind', 'gened',
            'minCredits', 3,
            'preferred', jsonb_build_object(
              'type', 'alt_credit',
              'sourceCode', 'CLEP',
              'identifier', 'AMERICAN_LITERATURE'
            ),
            'alternatives', jsonb_build_array(
              jsonb_build_object(
                'type', 'alt_credit',
                'sourceCode', 'CLEP',
                'identifier', 'ENGLISH_LITERATURE'
              )
            )
          ),
          
          -- Slot 2: US History I (3 cr)
          jsonb_build_object(
            'slotId', 'y2-t2-slot2',
            'requirementArea', 'SOCIAL_SCIENCE',
            'kind', 'gened',
            'minCredits', 3,
            'preferred', jsonb_build_object(
              'type', 'alt_credit',
              'sourceCode', 'CLEP',
              'identifier', 'HISTORY_US_I'
            ),
            'alternatives', jsonb_build_array()
          ),
          
          -- Slot 3: Business Law (3 cr)
          jsonb_build_object(
            'slotId', 'y2-t2-slot3',
            'requirementArea', 'BUS_CORE',
            'kind', 'major',
            'minCredits', 3,
            'preferred', jsonb_build_object(
              'type', 'alt_credit',
              'sourceCode', 'STUDY_COM',
              'identifier', 'BUS-201'
            ),
            'alternatives', jsonb_build_array()
          ),
          
          -- Slot 4: Principles of Management (3 cr - UPPER)
          jsonb_build_object(
            'slotId', 'y2-t2-slot4',
            'requirementArea', 'BUS_CORE',
            'kind', 'major',
            'minCredits', 3,
            'preferred', jsonb_build_object(
              'type', 'alt_credit',
              'sourceCode', 'CLEP',
              'identifier', 'PRINCIPLES_MANAGEMENT'
            ),
            'alternatives', jsonb_build_array(
              jsonb_build_object(
                'type', 'alt_credit',
                'sourceCode', 'STUDY_COM',
                'identifier', 'BUS-202'
              )
            )
          ),
          
          -- Slot 5: Principles of Marketing (3 cr - UPPER)
          jsonb_build_object(
            'slotId', 'y2-t2-slot5',
            'requirementArea', 'BUS_CORE',
            'kind', 'major',
            'minCredits', 3,
            'preferred', jsonb_build_object(
              'type', 'alt_credit',
              'sourceCode', 'CLEP',
              'identifier', 'PRINCIPLES_MARKETING'
            ),
            'alternatives', jsonb_build_array(
              jsonb_build_object(
                'type', 'alt_credit',
                'sourceCode', 'STUDY_COM',
                'identifier', 'BUS-203'
              )
            )
          )
        )
      ),
      
      -- ====================================================================
      -- YEAR 3, TERM 1 (Fall) - 15 credits - UPPER LEVEL FOCUS
      -- ====================================================================
      jsonb_build_object(
        'id', 'y3-t1',
        'label', 'Year 3, Term 1 (Fall)',
        'slots', jsonb_build_array(
          
          -- Slot 1: Financial Accounting (3 cr - UPPER)
          jsonb_build_object(
            'slotId', 'y3-t1-slot1',
            'requirementArea', 'UPPER_BUSINESS',
            'kind', 'major',
            'minCredits', 3,
            'preferred', jsonb_build_object(
              'type', 'alt_credit',
              'sourceCode', 'STUDY_COM',
              'identifier', 'BUS-303'
            ),
            'alternatives', jsonb_build_array()
          ),
          
          -- Slot 2: Managerial Accounting (3 cr - UPPER)
          jsonb_build_object(
            'slotId', 'y3-t1-slot2',
            'requirementArea', 'UPPER_BUSINESS',
            'kind', 'major',
            'minCredits', 3,
            'preferred', jsonb_build_object(
              'type', 'alt_credit',
              'sourceCode', 'STUDY_COM',
              'identifier', 'BUS-305'
            ),
            'alternatives', jsonb_build_array()
          ),
          
          -- Slot 3: Principles of Finance (3 cr - UPPER)
          jsonb_build_object(
            'slotId', 'y3-t1-slot3',
            'requirementArea', 'UPPER_BUSINESS',
            'kind', 'major',
            'minCredits', 3,
            'preferred', jsonb_build_object(
              'type', 'alt_credit',
              'sourceCode', 'DSST',
              'identifier', 'PRINCIPLES_FINANCE'
            ),
            'alternatives', jsonb_build_array()
          ),
          
          -- Slot 4: Organizational Behavior (3 cr - UPPER)
          jsonb_build_object(
            'slotId', 'y3-t1-slot4',
            'requirementArea', 'UPPER_BUSINESS',
            'kind', 'major',
            'minCredits', 3,
            'preferred', jsonb_build_object(
              'type', 'alt_credit',
              'sourceCode', 'DSST',
              'identifier', 'ORGANIZATIONAL_BEHAVIOR'
            ),
            'alternatives', jsonb_build_array()
          ),
          
          -- Slot 5: Project Management (3 cr - UPPER)
          jsonb_build_object(
            'slotId', 'y3-t1-slot5',
            'requirementArea', 'UPPER_BUSINESS',
            'kind', 'major',
            'minCredits', 3,
            'preferred', jsonb_build_object(
              'type', 'alt_credit',
              'sourceCode', 'SOPHIA',
              'identifier', 'BUS-220'
            ),
            'alternatives', jsonb_build_array()
          )
        )
      ),
      
      -- ====================================================================
      -- YEAR 3, TERM 2 (Spring) - 15 credits - UPPER LEVEL CONTINUED
      -- ====================================================================
      jsonb_build_object(
        'id', 'y3-t2',
        'label', 'Year 3, Term 2 (Spring)',
        'slots', jsonb_build_array(
          
          -- Slot 1: Operations Management (3 cr - UPPER)
          jsonb_build_object(
            'slotId', 'y3-t2-slot1',
            'requirementArea', 'UPPER_BUSINESS',
            'kind', 'major',
            'minCredits', 3,
            'preferred', jsonb_build_object(
              'type', 'alt_credit',
              'sourceCode', 'STUDY_COM',
              'identifier', 'BUS-307'
            ),
            'alternatives', jsonb_build_array()
          ),
          
          -- Slot 2: HR Management (3 cr - UPPER)
          jsonb_build_object(
            'slotId', 'y3-t2-slot2',
            'requirementArea', 'UPPER_BUSINESS',
            'kind', 'major',
            'minCredits', 3,
            'preferred', jsonb_build_object(
              'type', 'alt_credit',
              'sourceCode', 'DSST',
              'identifier', 'HUMAN_RESOURCE_MGMT'
            ),
            'alternatives', jsonb_build_array()
          ),
          
          -- Slot 3: International Business (3 cr - UPPER)
          jsonb_build_object(
            'slotId', 'y3-t2-slot3',
            'requirementArea', 'UPPER_BUSINESS',
            'kind', 'major',
            'minCredits', 3,
            'preferred', jsonb_build_object(
              'type', 'alt_credit',
              'sourceCode', 'STUDY_COM',
              'identifier', 'BUS-320'
            ),
            'alternatives', jsonb_build_array()
          ),
          
          -- Slot 4: Business Ethics (3 cr - UPPER)
          jsonb_build_object(
            'slotId', 'y3-t2-slot4',
            'requirementArea', 'UPPER_BUSINESS',
            'kind', 'major',
            'minCredits', 3,
            'preferred', jsonb_build_object(
              'type', 'alt_credit',
              'sourceCode', 'STUDY_COM',
              'identifier', 'BUS-330'
            ),
            'alternatives', jsonb_build_array()
          ),
          
          -- Slot 5: Free Elective (3 cr)
          jsonb_build_object(
            'slotId', 'y3-t2-slot5',
            'requirementArea', 'FREE_ELECTIVE',
            'kind', 'elective',
            'minCredits', 3,
            'preferred', jsonb_build_object(
              'type', 'alt_credit',
              'sourceCode', 'DSST',
              'identifier', 'COMPUTING_INFO_TECH'
            ),
            'alternatives', jsonb_build_array(
              jsonb_build_object(
                'type', 'alt_credit',
                'sourceCode', 'CLEP',
                'identifier', 'HISTORY_US_II'
              )
            )
          )
        )
      ),
      
      -- ====================================================================
      -- YEAR 4, TERM 1 (Fall) - 15 credits - TESU RESIDENCY
      -- ====================================================================
      jsonb_build_object(
        'id', 'y4-t1',
        'label', 'Year 4, Term 1 (Fall) - TESU Residency',
        'slots', jsonb_build_array(
          
          -- Slot 1: TESU Cornerstone (1 cr - REQUIRED)
          jsonb_build_object(
            'slotId', 'y4-t1-slot1',
            'requirementArea', 'BUS_CORE',
            'kind', 'major',
            'minCredits', 1,
            'preferred', jsonb_build_object(
              'type', 'institutional_course',
              'courseCode', 'LIB-100'
            ),
            'alternatives', jsonb_build_array()
          ),
          
          -- Slot 2: Strategic Management (3 cr - UPPER)
          jsonb_build_object(
            'slotId', 'y4-t1-slot2',
            'requirementArea', 'UPPER_BUSINESS',
            'kind', 'major',
            'minCredits', 3,
            'preferred', jsonb_build_object(
              'type', 'alt_credit',
              'sourceCode', 'STUDY_COM',
              'identifier', 'BUS-310'
            ),
            'alternatives', jsonb_build_array()
          ),
          
          -- Slot 3: Free Elective (3 cr)
          jsonb_build_object(
            'slotId', 'y4-t1-slot3',
            'requirementArea', 'FREE_ELECTIVE',
            'kind', 'elective',
            'minCredits', 3,
            'preferred', jsonb_build_object(
              'type', 'institutional_course',
              'courseCode', 'BUS-299'
            ),
            'alternatives', jsonb_build_array()
          ),
          
          -- Slot 4: Free Elective (3 cr)
          jsonb_build_object(
            'slotId', 'y4-t1-slot4',
            'requirementArea', 'FREE_ELECTIVE',
            'kind', 'elective',
            'minCredits', 3,
            'preferred', jsonb_build_object(
              'type', 'institutional_course',
              'courseCode', 'BUS-299'
            ),
            'alternatives', jsonb_build_array()
          ),
          
          -- Slot 5: Free Elective (3 cr)
          jsonb_build_object(
            'slotId', 'y4-t1-slot5',
            'requirementArea', 'FREE_ELECTIVE',
            'kind', 'elective',
            'minCredits', 3,
            'preferred', jsonb_build_object(
              'type', 'institutional_course',
              'courseCode', 'BUS-299'
            ),
            'alternatives', jsonb_build_array()
          )
        )
      ),
      
      -- ====================================================================
      -- YEAR 4, TERM 2 (Spring) - 15 credits - CAPSTONE
      -- ====================================================================
      jsonb_build_object(
        'id', 'y4-t2',
        'label', 'Year 4, Term 2 (Spring) - Capstone',
        'slots', jsonb_build_array(
          
          -- Slot 1: TESU Capstone (3 cr - REQUIRED)
          jsonb_build_object(
            'slotId', 'y4-t2-slot1',
            'requirementArea', 'CAPSTONE',
            'kind', 'capstone',
            'minCredits', 3,
            'preferred', jsonb_build_object(
              'type', 'institutional_course',
              'courseCode', 'BUS-421'
            ),
            'alternatives', jsonb_build_array()
          ),
          
          -- Slot 2: Free Elective (3 cr)
          jsonb_build_object(
            'slotId', 'y4-t2-slot2',
            'requirementArea', 'FREE_ELECTIVE',
            'kind', 'elective',
            'minCredits', 3,
            'preferred', jsonb_build_object(
              'type', 'institutional_course',
              'courseCode', 'BUS-299'
            ),
            'alternatives', jsonb_build_array()
          ),
          
          -- Slot 3: Free Elective (3 cr)
          jsonb_build_object(
            'slotId', 'y4-t2-slot3',
            'requirementArea', 'FREE_ELECTIVE',
            'kind', 'elective',
            'minCredits', 3,
            'preferred', jsonb_build_object(
              'type', 'institutional_course',
              'courseCode', 'BUS-299'
            ),
            'alternatives', jsonb_build_array()
          ),
          
          -- Slot 4: Free Elective (3 cr)
          jsonb_build_object(
            'slotId', 'y4-t2-slot4',
            'requirementArea', 'FREE_ELECTIVE',
            'kind', 'elective',
            'minCredits', 3,
            'preferred', jsonb_build_object(
              'type', 'institutional_course',
              'courseCode', 'BUS-299'
            ),
            'alternatives', jsonb_build_array()
          ),
          
          -- Slot 5: Free Elective (3 cr)
          jsonb_build_object(
            'slotId', 'y4-t2-slot5',
            'requirementArea', 'FREE_ELECTIVE',
            'kind', 'elective',
            'minCredits', 3,
            'preferred', jsonb_build_object(
              'type', 'institutional_course',
              'courseCode', 'BUS-299'
            ),
            'alternatives', jsonb_build_array()
          )
        )
      )
    )
  ),
  '2025',
  '2025-01-15'::date,
  'Optimized for lowest cost using Sophia ($99/mo for 18-24 credits), CLEP ($93/exam), DSST ($100/exam), and Study.com ($199/mo for upper-level). Includes 15 TESU residency credits (1 cornerstone + 3 capstone + 11 electives) to satisfy minimum requirements. Total alternative credits: 105. Total TESU credits: 15.'
)
ON CONFLICT (id) DO UPDATE SET
  template_data = EXCLUDED.template_data,
  updated_at = now();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- View the created template
SELECT * FROM public.degree_templates WHERE id = 'tesu-bsba-cheapest-2025';

-- Count credits by requirement area
SELECT 
  jsonb_array_elements(
    jsonb_array_elements(template_data->'terms')->'slots'
  )->>'requirementArea' as requirement_area,
  SUM((jsonb_array_elements(
    jsonb_array_elements(template_data->'terms')->'slots'
  )->>'minCredits')::int) as total_credits
FROM public.degree_templates
WHERE id = 'tesu-bsba-cheapest-2025'
GROUP BY requirement_area;

-- Count upper-level slots
SELECT 
  COUNT(*) as upper_level_slots
FROM public.degree_templates,
  jsonb_array_elements(template_data->'terms') as term,
  jsonb_array_elements(term->'slots') as slot
WHERE id = 'tesu-bsba-cheapest-2025'
  AND slot->>'requirementArea' = 'UPPER_BUSINESS';

-- Summary
SELECT 
  id,
  institution_code,
  program_code,
  track_type,
  total_credits,
  estimated_cost,
  estimated_duration_months,
  jsonb_array_length(template_data->'terms') as term_count,
  (
    SELECT COUNT(*)
    FROM jsonb_array_elements(template_data->'terms') as term,
         jsonb_array_elements(term->'slots') as slot
  ) as total_slots
FROM public.degree_templates
WHERE id = 'tesu-bsba-cheapest-2025';
