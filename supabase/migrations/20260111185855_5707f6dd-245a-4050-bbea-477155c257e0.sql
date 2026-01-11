-- Update provenance URLs to specific policy pages with excerpts
UPDATE institution_policy_packs
SET provenance_url = 'https://www.tesu.edu/admissions/faqs/transfer-credits.php',
    policy_data = policy_data || jsonb_build_object(
      'provenance_excerpt', 'Effective Jan. 1, 2021, the University accepts a maximum of 90 undergraduate credits from noncollegiate providers regardless of the source',
      'provenance_verified_at', now()
    )
WHERE institution = 'TESU' AND status = 'active';

UPDATE institution_policy_packs
SET provenance_url = 'https://www.charteroak.edu/catalog/current/sources_credit/non_collegiate_course_prov.php',
    policy_data = policy_data || jsonb_build_object(
      'provenance_excerpt', 'Students will be limited to a total of 90 degree-applicable credits for a Bachelors degree from non-regionally accredited course providers',
      'provenance_verified_at', now()
    )
WHERE institution = 'COSC' AND status = 'active';

UPDATE institution_policy_packs
SET provenance_url = 'https://www.snhu.edu/admission/transferring-credits/work-life-experience',
    policy_data = policy_data || jsonb_build_object(
      'provenance_excerpt', 'SNHU accepts up to 90 transfer credits toward your bachelor''s – that''s 75% of your program – so you can combine your CPL with other credits',
      'provenance_verified_at', now(),
      'alt_transfer_combined', true
    )
WHERE institution = 'SNHU' AND status = 'active';