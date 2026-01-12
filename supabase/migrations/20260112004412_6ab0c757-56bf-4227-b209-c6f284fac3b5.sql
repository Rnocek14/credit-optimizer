-- Fix field name consistency and add provenance URLs
-- The policy_data uses 'upper_division_min' but code checks 'min_upper_division_credits'
-- Also adding authoritative provenance URLs

UPDATE institution_policy_packs
SET policy_data = policy_data 
  || jsonb_build_object(
    'min_upper_division_credits', (policy_data->>'upper_division_min')::int,
    'provenance_url', 'https://www.tesu.edu/undergraduate/catalog'
  )
WHERE institution = 'TESU' AND status = 'active';

UPDATE institution_policy_packs
SET policy_data = policy_data 
  || jsonb_build_object(
    'min_upper_division_credits', (policy_data->>'upper_division_min')::int,
    'provenance_url', 'https://www.charteroak.edu/current-students/registrar/residency-requirements.php'
  )
WHERE institution = 'COSC' AND status = 'active';