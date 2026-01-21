-- Drop existing views to recreate with correct columns
DROP VIEW IF EXISTS public.invariant_pattern_url_mismatch CASCADE;
DROP VIEW IF EXISTS public.invariant_no_empty_norm_codes CASCADE;

-- 4) Create invariant: pattern providers must have URLs matching the pattern
CREATE VIEW public.invariant_pattern_url_mismatch AS
SELECT 
  sc.id AS course_id,
  sc.provider_code AS src_provider,
  sc.canonical_code AS src_code,
  sc.canonical_url AS actual_url,
  pr.canonical_url_pattern AS pattern_template,
  replace(pr.canonical_url_pattern, '{code}', sc.canonical_code) AS expected_url
FROM public.source_courses sc
JOIN public.provider_registry pr ON pr.provider_code_norm = sc.provider_code
WHERE pr.canonical_url_mode = 'pattern'
  AND pr.canonical_url_pattern IS NOT NULL
  AND sc.canonical_code IS NOT NULL
  AND (
    sc.canonical_url IS NULL
    OR sc.canonical_url != replace(pr.canonical_url_pattern, '{code}', sc.canonical_code)
  );

COMMENT ON VIEW public.invariant_pattern_url_mismatch
IS 'Compliance tripwire: pattern-mode providers must have canonical_url matching the registry pattern. Detects drift like sunyempire.sophia.org.';

-- 5) Create invariant: no empty normalized codes exist
CREATE VIEW public.invariant_no_empty_norm_codes AS
SELECT 
  id AS course_id, 
  provider_code AS src_provider, 
  canonical_code AS src_code, 
  canonical_code_norm AS src_code_norm
FROM public.source_courses
WHERE canonical_code IS NOT NULL 
  AND btrim(canonical_code) != ''
  AND (canonical_code_norm IS NULL OR btrim(canonical_code_norm) = '');

COMMENT ON VIEW public.invariant_no_empty_norm_codes
IS 'Compliance tripwire: courses with canonical_code must have non-empty canonical_code_norm.';