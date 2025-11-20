-- ============================================================================
-- Phase 2: Seed TESU BSBA Degree Templates
-- ============================================================================
-- This migration seeds two TESU BSBA degree templates:
-- 1. Standard Track (institutional course heavy)
-- 2. Alt-Credit Max Track (maximizes Sophia/CLEP/DSST/Study.com)
--
-- Prerequisite: Phase 1 migration must be applied first (institutions, 
-- gened_frameworks, gened_categories, alt_credits, cross_institution_equivalencies)
-- ============================================================================

-- ============================================================================
-- 1. TESU BSBA - Standard Track
-- ============================================================================
INSERT INTO degree_templates (
  institution_id,
  institution_code,
  program_code,
  track_type,
  total_credits,
  estimated_cost,
  estimated_duration_months,
  template_data
)
SELECT
  i.id,
  'TESU',
  'BSBA',
  'standard',
  120,
  25000,
  36,
  '{
    "programCode": "BSBA",
    "trackType": "standard",
    "totalCredits": 120,
    "terms": [
      {
        "id": "y1-t1",
        "label": "Year 1 - Term 1",
        "slots": [
          {
            "slotId": "written-comm-1",
            "requirementArea": "WRITTEN_COMM",
            "kind": "gened",
            "minCredits": 3,
            "preferred": { "type": "institutional_course", "courseCode": "ENC-101" },
            "alternatives": [
              { "type": "institutional_course", "courseCode": "ENC-102" },
              { "type": "alt_credit", "sourceCode": "SOPHIA", "identifier": "ENG101" }
            ]
          },
          {
            "slotId": "quantitative-1",
            "requirementArea": "QUANTITATIVE",
            "kind": "gened",
            "minCredits": 3,
            "preferred": { "type": "institutional_course", "courseCode": "MAT-121" },
            "alternatives": [
              { "type": "alt_credit", "sourceCode": "SOPHIA", "identifier": "COLLEGE_ALGEBRA" },
              { "type": "alt_credit", "sourceCode": "CLEP", "identifier": "COLLEGE_ALGEBRA" }
            ]
          },
          {
            "slotId": "social-science-1",
            "requirementArea": "SOCIAL_SCIENCE",
            "kind": "gened",
            "minCredits": 3,
            "preferred": { "type": "institutional_course", "courseCode": "PSY-101" },
            "alternatives": [
              { "type": "alt_credit", "sourceCode": "SOPHIA", "identifier": "INTRO_PSYCH" },
              { "type": "alt_credit", "sourceCode": "CLEP", "identifier": "INTRO_PSYCHOLOGY" }
            ]
          },
          {
            "slotId": "humanities-1",
            "requirementArea": "HUMANITIES",
            "kind": "gened",
            "minCredits": 3,
            "preferred": { "type": "institutional_course", "courseCode": "PHI-286" },
            "alternatives": [
              { "type": "alt_credit", "sourceCode": "DSST", "identifier": "ETHICS_AMERICA" },
              { "type": "alt_credit", "sourceCode": "SOPHIA", "identifier": "ETHICS1000" }
            ]
          }
        ]
      },
      {
        "id": "y1-t2",
        "label": "Year 1 - Term 2",
        "slots": [
          {
            "slotId": "written-comm-2",
            "requirementArea": "WRITTEN_COMM",
            "kind": "gened",
            "minCredits": 3,
            "preferred": { "type": "institutional_course", "courseCode": "ENC-102" },
            "alternatives": [
              { "type": "alt_credit", "sourceCode": "CLEP", "identifier": "COLLEGE_COMPOSITION" }
            ]
          },
          {
            "slotId": "social-science-2",
            "requirementArea": "SOCIAL_SCIENCE",
            "kind": "gened",
            "minCredits": 3,
            "preferred": { "type": "institutional_course", "courseCode": "SOC-101" },
            "alternatives": [
              { "type": "alt_credit", "sourceCode": "CLEP", "identifier": "INTRO_SOCIOLOGY" },
              { "type": "alt_credit", "sourceCode": "SOPHIA", "identifier": "INTRO_SOC" }
            ]
          },
          {
            "slotId": "natural-science-1",
            "requirementArea": "NATURAL_SCIENCE",
            "kind": "gened",
            "minCredits": 3,
            "preferred": { "type": "institutional_course", "courseCode": "BIO-208" },
            "alternatives": [
              { "type": "alt_credit", "sourceCode": "SOPHIA", "identifier": "HUMAN_BIO" }
            ]
          },
          {
            "slotId": "oral-comm",
            "requirementArea": "ORAL_COMM",
            "kind": "gened",
            "minCredits": 3,
            "preferred": { "type": "institutional_course", "courseCode": "COM-209" },
            "alternatives": [
              { "type": "alt_credit", "sourceCode": "DSST", "identifier": "PUBLIC_SPEAKING" }
            ]
          }
        ]
      },
      {
        "id": "y2-t1",
        "label": "Year 2 - Term 1",
        "slots": [
          {
            "slotId": "macro",
            "requirementArea": "BUS_CORE",
            "kind": "major",
            "minCredits": 3,
            "preferred": { "type": "institutional_course", "courseCode": "ECO-111" },
            "alternatives": [
              { "type": "alt_credit", "sourceCode": "SOPHIA", "identifier": "MACRO101" }
            ]
          },
          {
            "slotId": "micro",
            "requirementArea": "BUS_CORE",
            "kind": "major",
            "minCredits": 3,
            "preferred": { "type": "institutional_course", "courseCode": "ECO-112" },
            "alternatives": [
              { "type": "alt_credit", "sourceCode": "SOPHIA", "identifier": "MICRO101" }
            ]
          },
          {
            "slotId": "accounting-1",
            "requirementArea": "BUS_CORE",
            "kind": "major",
            "minCredits": 3,
            "preferred": { "type": "institutional_course", "courseCode": "ACC-101" },
            "alternatives": [
              { "type": "alt_credit", "sourceCode": "STUDY_COM", "identifier": "ACCT101" }
            ]
          },
          {
            "slotId": "management",
            "requirementArea": "BUS_CORE",
            "kind": "major",
            "minCredits": 3,
            "preferred": { "type": "institutional_course", "courseCode": "MAN-301" },
            "alternatives": [
              { "type": "alt_credit", "sourceCode": "CLEP", "identifier": "PRINCIPLES_MANAGEMENT" },
              { "type": "alt_credit", "sourceCode": "STUDY_COM", "identifier": "BUS101" }
            ]
          }
        ]
      },
      {
        "id": "y3-t1",
        "label": "Year 3 - Term 1",
        "slots": [
          {
            "slotId": "marketing",
            "requirementArea": "BUS_CORE",
            "kind": "major",
            "minCredits": 3,
            "preferred": { "type": "institutional_course", "courseCode": "MAR-301" },
            "alternatives": [
              { "type": "alt_credit", "sourceCode": "CLEP", "identifier": "PRINCIPLES_MARKETING" }
            ]
          },
          {
            "slotId": "law",
            "requirementArea": "BUS_CORE",
            "kind": "major",
            "minCredits": 3,
            "preferred": { "type": "institutional_course", "courseCode": "LAW-201" },
            "alternatives": [
              { "type": "alt_credit", "sourceCode": "DSST", "identifier": "BUSINESS_LAW_II" }
            ]
          },
          {
            "slotId": "finance",
            "requirementArea": "BUS_CORE",
            "minCredits": 3,
            "kind": "major",
            "preferred": { "type": "institutional_course", "courseCode": "FIN-301" },
            "alternatives": []
          },
          {
            "slotId": "capstone",
            "requirementArea": "CAPSTONE",
            "minCredits": 3,
            "kind": "capstone",
            "preferred": { "type": "institutional_course", "courseCode": "BUS-421" },
            "alternatives": []
          }
        ]
      }
    ]
  }'::jsonb
FROM institutions i
WHERE i.code = 'TESU'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 2. TESU BSBA - Alt-Credit Max Track
-- ============================================================================
INSERT INTO degree_templates (
  institution_id,
  institution_code,
  program_code,
  track_type,
  total_credits,
  estimated_cost,
  estimated_duration_months,
  template_data
)
SELECT
  i.id,
  'TESU',
  'BSBA',
  'alt_max',
  120,
  8000,
  18,
  '{
    "programCode": "BSBA",
    "trackType": "alt_max",
    "totalCredits": 120,
    "terms": [
      {
        "id": "alt-y1-t1",
        "label": "Alt Path - Term 1",
        "slots": [
          {
            "slotId": "written-comm-1",
            "requirementArea": "WRITTEN_COMM",
            "kind": "gened",
            "minCredits": 3,
            "preferred": { "type": "alt_credit", "sourceCode": "SOPHIA", "identifier": "ENG101" },
            "alternatives": [
              { "type": "alt_credit", "sourceCode": "SOPHIA", "identifier": "ENG102" },
              { "type": "alt_credit", "sourceCode": "CLEP", "identifier": "COLLEGE_COMPOSITION" }
            ]
          },
          {
            "slotId": "quantitative-1",
            "requirementArea": "QUANTITATIVE",
            "kind": "gened",
            "minCredits": 3,
            "preferred": { "type": "alt_credit", "sourceCode": "SOPHIA", "identifier": "COLLEGE_ALGEBRA" },
            "alternatives": [
              { "type": "alt_credit", "sourceCode": "CLEP", "identifier": "COLLEGE_ALGEBRA" }
            ]
          },
          {
            "slotId": "social-psych",
            "requirementArea": "SOCIAL_SCIENCE",
            "kind": "gened",
            "preferred": { "type": "alt_credit", "sourceCode": "SOPHIA", "identifier": "INTRO_PSYCH" },
            "alternatives": [
              { "type": "alt_credit", "sourceCode": "CLEP", "identifier": "INTRO_PSYCHOLOGY" }
            ],
            "minCredits": 3
          },
          {
            "slotId": "humanities-ethics",
            "requirementArea": "HUMANITIES",
            "kind": "gened",
            "preferred": { "type": "alt_credit", "sourceCode": "SOPHIA", "identifier": "ETHICS1000" },
            "alternatives": [
              { "type": "alt_credit", "sourceCode": "DSST", "identifier": "ETHICS_AMERICA" }
            ],
            "minCredits": 3
          }
        ]
      },
      {
        "id": "alt-y1-t2",
        "label": "Alt Path - Term 2",
        "slots": [
          {
            "slotId": "macro",
            "requirementArea": "BUS_CORE",
            "kind": "major",
            "preferred": { "type": "alt_credit", "sourceCode": "SOPHIA", "identifier": "MACRO101" },
            "alternatives": [],
            "minCredits": 3
          },
          {
            "slotId": "micro",
            "requirementArea": "BUS_CORE",
            "kind": "major",
            "preferred": { "type": "alt_credit", "sourceCode": "SOPHIA", "identifier": "MICRO101" },
            "alternatives": [],
            "minCredits": 3
          },
          {
            "slotId": "accounting-1",
            "requirementArea": "BUS_CORE",
            "kind": "major",
            "preferred": { "type": "alt_credit", "sourceCode": "STUDY_COM", "identifier": "ACCT101" },
            "alternatives": [],
            "minCredits": 3
          },
          {
            "slotId": "management",
            "requirementArea": "BUS_CORE",
            "kind": "major",
            "preferred": { "type": "alt_credit", "sourceCode": "CLEP", "identifier": "PRINCIPLES_MANAGEMENT" },
            "alternatives": [
              { "type": "alt_credit", "sourceCode": "STUDY_COM", "identifier": "BUS101" }
            ],
            "minCredits": 3
          }
        ]
      },
      {
        "id": "alt-y2-t1",
        "label": "Alt Path - Term 3",
        "slots": [
          {
            "slotId": "marketing",
            "requirementArea": "BUS_CORE",
            "kind": "major",
            "preferred": { "type": "alt_credit", "sourceCode": "CLEP", "identifier": "PRINCIPLES_MARKETING" },
            "minCredits": 3
          },
          {
            "slotId": "business-law",
            "requirementArea": "BUS_CORE",
            "kind": "major",
            "preferred": { "type": "alt_credit", "sourceCode": "DSST", "identifier": "BUSINESS_LAW_II" },
            "minCredits": 3
          },
          {
            "slotId": "management-info-systems",
            "requirementArea": "BUS_CORE",
            "preferred": { "type": "alt_credit", "sourceCode": "STUDY_COM", "identifier": "BUS104" },
            "kind": "major",
            "minCredits": 3
          },
          {
            "slotId": "elective-1",
            "requirementArea": "FREE_ELECTIVE",
            "kind": "elective",
            "preferred": { "type": "alt_credit", "sourceCode": "SOPHIA", "identifier": "INTRO_SOC" },
            "minCredits": 3
          }
        ]
      },
      {
        "id": "tesu-required",
        "label": "TESU Required Residency Courses",
        "slots": [
          {
            "slotId": "strategic-management",
            "requirementArea": "BUS_CORE",
            "kind": "major",
            "preferred": { "type": "institutional_course", "courseCode": "MAN-373" },
            "minCredits": 3
          },
          {
            "slotId": "capstone",
            "requirementArea": "CAPSTONE",
            "kind": "capstone",
            "preferred": { "type": "institutional_course", "courseCode": "BUS-421" },
            "minCredits": 3
          },
          {
            "slotId": "upper-business-elective",
            "requirementArea": "UPPER_BUSINESS",
            "kind": "major",
            "preferred": { "type": "institutional_course", "courseCode": "FIN-301" },
            "minCredits": 3
          }
        ]
      }
    ]
  }'::jsonb
FROM institutions i
WHERE i.code = 'TESU'
ON CONFLICT DO NOTHING;
