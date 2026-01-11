-- Phase A: Populate required policy pack fields for all anchor institutions
-- This ensures deterministic degree builds with no silent defaults
-- Values sourced from src/lib/degree/institutionPolicies.ts (verified)

-- Create a function to update policy_data with required fields if missing
-- Uses COALESCE to preserve existing values and only fill missing ones

-- TESU Active Pack
UPDATE institution_policy_packs
SET policy_data = COALESCE(policy_data, '{}'::jsonb) || jsonb_build_object(
  'degree_credit_total', 120,
  'residency_requirement', jsonb_build_object(
    'credits', 15,
    'variant', 'standard',
    'notes', 'Per Credit Tuition Plan: 15 TESU credits via Online, Guided Study, or e-Pack courses'
  ),
  'transfer_credit_policy', jsonb_build_object(
    'max_total_transfer', 105,
    'max_alt_credit', 90,
    'max_community_college', 90
  ),
  'grade_rules', jsonb_build_object(
    'min_transfer_grade', 'D',
    'min_grade_area_of_study', 'C',
    'min_grade_english_comp', 'C'
  ),
  'capstone_in_residence', true,
  'required_residence_courses', jsonb_build_array(
    jsonb_build_object('code', 'SOS-1100', 'name', 'Information Literacy Today', 'credits', 3),
    jsonb_build_object('code', 'CAPSTONE', 'name', 'Program-specific Capstone', 'credits', 3)
  ),
  'upper_division_min', 18
)
WHERE institution = 'TESU' AND status = 'active';

-- COSC Active Pack
UPDATE institution_policy_packs
SET policy_data = COALESCE(policy_data, '{}'::jsonb) || jsonb_build_object(
  'degree_credit_total', 120,
  'residency_requirement', jsonb_build_object(
    'credits', 6,
    'variant', 'standard',
    'notes', 'Cornerstone (3cr) + Capstone (3cr) = 6 credits minimum'
  ),
  'transfer_credit_policy', jsonb_build_object(
    'max_total_transfer', 114,
    'max_alt_credit', 90,
    'max_community_college', 90
  ),
  'grade_rules', jsonb_build_object(
    'min_transfer_grade', 'C',
    'min_grade_area_of_study', 'C'
  ),
  'capstone_in_residence', true,
  'cornerstone_in_residence', true,
  'required_residence_courses', jsonb_build_array(
    jsonb_build_object('code', 'CORNERSTONE', 'name', 'IDS 101 Cornerstone', 'credits', 3),
    jsonb_build_object('code', 'CAPSTONE', 'name', 'IDS 402 Capstone', 'credits', 3)
  ),
  'upper_division_min', 30,
  'partner_only_ace', false
)
WHERE institution = 'COSC' AND status = 'active';

-- WGU (no active pack exists, update deprecated to set baseline)
UPDATE institution_policy_packs
SET policy_data = COALESCE(policy_data, '{}'::jsonb) || jsonb_build_object(
  'degree_credit_total', 120,
  'residency_requirement', jsonb_build_object(
    'credits', 30,
    'variant', 'standard',
    'notes', 'WGU competency-based: ~30 credits typically earned in-house'
  ),
  'transfer_credit_policy', jsonb_build_object(
    'max_total_transfer', 90,
    'max_alt_credit', 75,
    'max_community_college', 90
  ),
  'grade_rules', jsonb_build_object(
    'min_transfer_grade', 'C'
  ),
  'capstone_in_residence', true,
  'upper_division_min', 40
)
WHERE institution = 'WGU';

-- SNHU Active Pack
UPDATE institution_policy_packs
SET policy_data = COALESCE(policy_data, '{}'::jsonb) || jsonb_build_object(
  'degree_credit_total', 120,
  'residency_requirement', jsonb_build_object(
    'credits', 30,
    'variant', 'standard',
    'notes', 'SNHU requires 30 credits in residence'
  ),
  'transfer_credit_policy', jsonb_build_object(
    'max_total_transfer', 90,
    'max_alt_credit', 90,
    'max_community_college', 90
  ),
  'grade_rules', jsonb_build_object(
    'min_transfer_grade', 'C'
  ),
  'capstone_in_residence', true,
  'upper_division_min', 30
)
WHERE institution = 'SNHU';

-- EMPIRE (Empire State) Draft Packs
UPDATE institution_policy_packs
SET policy_data = COALESCE(policy_data, '{}'::jsonb) || jsonb_build_object(
  'degree_credit_total', 120,
  'residency_requirement', jsonb_build_object(
    'credits', 32,
    'variant', 'standard',
    'notes', 'Empire State requires 32 credits in residence for bachelor''s'
  ),
  'transfer_credit_policy', jsonb_build_object(
    'max_total_transfer', 88,
    'max_alt_credit', 64,
    'max_community_college', 64
  ),
  'grade_rules', jsonb_build_object(
    'min_transfer_grade', 'C'
  ),
  'capstone_in_residence', true,
  'upper_division_min', 45
)
WHERE institution = 'EMPIRE';

-- EXCELSIOR / EXCEL (legacy)
UPDATE institution_policy_packs
SET policy_data = COALESCE(policy_data, '{}'::jsonb) || jsonb_build_object(
  'degree_credit_total', 120,
  'residency_requirement', jsonb_build_object(
    'credits', 9,
    'variant', 'standard',
    'notes', 'Excelsior requires minimum 9 credits in residence'
  ),
  'transfer_credit_policy', jsonb_build_object(
    'max_total_transfer', 111,
    'max_alt_credit', 90,
    'max_community_college', 90
  ),
  'grade_rules', jsonb_build_object(
    'min_transfer_grade', 'D'
  ),
  'capstone_in_residence', true,
  'upper_division_min', 30
)
WHERE institution IN ('EXCEL', 'EXCELSIOR');

-- FRANKLIN 
UPDATE institution_policy_packs
SET policy_data = COALESCE(policy_data, '{}'::jsonb) || jsonb_build_object(
  'degree_credit_total', 120,
  'residency_requirement', jsonb_build_object(
    'credits', 30,
    'variant', 'standard',
    'notes', 'Franklin University requires 30 credits in residence'
  ),
  'transfer_credit_policy', jsonb_build_object(
    'max_total_transfer', 90,
    'max_alt_credit', 60,
    'max_community_college', 90
  ),
  'grade_rules', jsonb_build_object(
    'min_transfer_grade', 'C'
  ),
  'capstone_in_residence', true,
  'upper_division_min', 30
)
WHERE institution = 'FRANKLIN';

-- UMGC
UPDATE institution_policy_packs
SET policy_data = COALESCE(policy_data, '{}'::jsonb) || jsonb_build_object(
  'degree_credit_total', 120,
  'residency_requirement', jsonb_build_object(
    'credits', 30,
    'variant', 'standard',
    'notes', 'UMGC requires minimum 30 credits in residence'
  ),
  'transfer_credit_policy', jsonb_build_object(
    'max_total_transfer', 90,
    'max_alt_credit', 90,
    'max_community_college', 60
  ),
  'grade_rules', jsonb_build_object(
    'min_transfer_grade', 'C'
  ),
  'capstone_in_residence', true,
  'upper_division_min', 30
)
WHERE institution = 'UMGC';

-- PURDUE_GLOBAL
UPDATE institution_policy_packs
SET policy_data = COALESCE(policy_data, '{}'::jsonb) || jsonb_build_object(
  'degree_credit_total', 180,
  'residency_requirement', jsonb_build_object(
    'credits', 45,
    'variant', 'standard',
    'notes', 'Purdue Global quarter system: 180 quarter credits = 120 semester, 45 in residence'
  ),
  'transfer_credit_policy', jsonb_build_object(
    'max_total_transfer', 135,
    'max_alt_credit', 90,
    'max_community_college', 90
  ),
  'grade_rules', jsonb_build_object(
    'min_transfer_grade', 'C'
  ),
  'capstone_in_residence', true,
  'upper_division_min', 60
)
WHERE institution = 'PURDUE_GLOBAL';