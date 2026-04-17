
-- ============================================================================
-- D3 Phase 1: Seed + Promote LIBERTY (mirror SNHU operating pattern)
-- ============================================================================

-- Step 1: Seed LIBERTY ground truth
INSERT INTO public.institution_policy_ground_truth (
  institution,
  academic_year,
  residency_credits,
  max_transfer_credits,
  source_url,
  verified_by,
  last_verified_at,
  notes
) VALUES (
  'LIBERTY',
  '2024-2025',
  30,
  90,
  'https://www.liberty.edu/online/transfer-credit-faqs/',
  'human_review_after_machine_extraction',
  now(),
  'Liberty Online: 25% residency requirement on a 120-cr bachelor''s = 30 cr in residence. Bachelor cap = 90 transfer credits per LUO Transfer FAQ. Bucket mode = combined (single ceiling, alt credits count toward the same 90).'
)
ON CONFLICT (institution, academic_year) DO UPDATE SET
  residency_credits = EXCLUDED.residency_credits,
  max_transfer_credits = EXCLUDED.max_transfer_credits,
  source_url = EXCLUDED.source_url,
  verified_by = EXCLUDED.verified_by,
  last_verified_at = EXCLUDED.last_verified_at,
  notes = EXCLUDED.notes;

-- Step 2: Create a fresh institution-scoped LIBERTY pack in draft
WITH new_pack AS (
  INSERT INTO public.institution_policy_packs (
    institution,
    academic_year,
    degree_level,
    pack_scope,
    status,
    confidence_score,
    has_ground_truth,
    verified_by,
    last_verified_at,
    verification_source,
    provenance_url,
    policy_json,
    policy_data,
    field_provenance
  ) VALUES (
    'LIBERTY',
    '2024-2025',
    'undergraduate',
    'institution',
    'draft',
    89,
    true,
    'human_review_after_machine_extraction',
    now(),
    'liberty_transfer_faq_2026_04_17',
    'https://www.liberty.edu/online/transfer-credit-faqs/',
    -- policy_json (NOT NULL) - mirror policy_data
    jsonb_build_object(
      'residency_credits', 30,
      'max_transfer_credits', 90,
      'max_transfer_alt_combined_credits', 90,
      'transfer_alt_bucket_mode', 'combined',
      'degree_credit_total', 120,
      'total_credits', 120,
      'confidence', 0.89,
      'accepts_ap', true,
      'accepts_clep', true,
      'accepts_dsst', true,
      'accepts_portfolio', true,
      'accepts_tecep', false,
      'capstone_required', false,
      'cornerstone_required', false,
      'provenance_source_url', 'https://www.liberty.edu/online/transfer-credit-faqs/',
      'provenance_verified_at', now()::text,
      'provenance_verified_by', 'human_review_after_machine_extraction'
    ),
    -- policy_data (used by gates)
    jsonb_build_object(
      'residency_credits', 30,
      'max_transfer_credits', 90,
      'max_transfer_alt_combined_credits', 90,
      'max_ace_nccrs_credits', NULL,
      'max_alt_credit', NULL,
      'min_upper_level_credits', NULL,
      'transfer_alt_bucket_mode', 'combined',
      'degree_credit_total', 120,
      'total_credits', 120,
      'confidence', 0.89,
      'accepts_ap', true,
      'accepts_clep', true,
      'accepts_dsst', true,
      'accepts_portfolio', true,
      'accepts_tecep', false,
      'capstone_required', false,
      'cornerstone_required', false,
      'provenance_source_url', 'https://www.liberty.edu/online/transfer-credit-faqs/',
      'provenance_verified_at', now()::text,
      'provenance_verified_by', 'human_review_after_machine_extraction'
    ),
    -- field_provenance (gate checks flat keys for human_override / ground_truth)
    jsonb_build_object(
      'residency_credits', jsonb_build_object(
        'final_value', 30,
        'source', 'human_override',
        'source_ref', 'https://www.liberty.edu/online/transfer-credit-faqs/',
        'verified_at', now()::text,
        'note', 'Liberty publishes a 25% residency rule on a 120-cr bachelor = 30 cr.'
      ),
      'max_transfer_credits', jsonb_build_object(
        'final_value', 90,
        'source', 'human_override',
        'source_ref', 'https://www.liberty.edu/online/transfer-credit-faqs/',
        'verified_at', now()::text,
        'note', 'LUO Transfer FAQ: 90-cr bachelor transfer cap.'
      ),
      'max_transfer_alt_combined_credits', jsonb_build_object(
        'final_value', 90,
        'source', 'human_override',
        'source_ref', 'https://www.liberty.edu/online/transfer-credit-faqs/',
        'verified_at', now()::text,
        'note', 'Liberty uses a single 90-cr ceiling that includes alt credits (combined bucket).'
      ),
      'transfer_alt_bucket_mode', jsonb_build_object(
        'final_value', 'combined',
        'source', 'human_override',
        'source_ref', 'https://www.liberty.edu/online/transfer-credit-faqs/',
        'verified_at', now()::text,
        'note', 'No separate alt-credit ceiling published; alt credits count toward the same 90-cr cap.'
      ),
      'degree_credit_total', jsonb_build_object(
        'final_value', 120,
        'source', 'human_override',
        'verified_at', now()::text,
        'note', 'Standard undergraduate bachelor''s total (120 cr).'
      ),
      'residency_policy.min_institutional_credits', jsonb_build_object(
        'final_value', 30,
        'source', 'ground_truth',
        'source_ref', 'https://www.liberty.edu/online/transfer-credit-faqs/'
      ),
      'transfer_credit_limits.max_total_transfer_credits', jsonb_build_object(
        'final_value', 90,
        'source', 'ground_truth',
        'source_ref', 'https://www.liberty.edu/online/transfer-credit-faqs/'
      ),
      'max_ace_nccrs_credits', jsonb_build_object(
        'final_value', NULL,
        'source', 'ai_extraction'
      )
    )
  )
  RETURNING id
)
-- Step 3: Promote the freshly created pack to active
UPDATE public.institution_policy_packs
SET status = 'active',
    promoted_at = now()
WHERE id = (SELECT id FROM new_pack);
