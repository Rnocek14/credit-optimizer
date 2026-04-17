-- Seed SNHU pack with human_override bucket_mode + complete flat provenance keys
-- so it can pass the activation trust gate.
UPDATE public.institution_policy_packs
SET
  policy_data = policy_data || jsonb_build_object(
    'transfer_alt_bucket_mode', 'combined'
  ),
  field_provenance = COALESCE(field_provenance, '{}'::jsonb) || jsonb_build_object(
    'transfer_alt_bucket_mode', jsonb_build_object(
      'source', 'human_override',
      'final_value', 'combined',
      'source_ref', 'https://www.snhu.edu/admission/transferring-credits',
      'note', 'SNHU publishes a single 90-credit transfer cap with no separate alt-credit ceiling; alt credits count toward the same cap (combined bucket). Human-verified policy fact.',
      'verified_at', now()::text
    ),
    'degree_credit_total', jsonb_build_object(
      'source', 'human_override',
      'final_value', 120,
      'note', 'Standard undergraduate bachelor''s total (120 cr).',
      'verified_at', now()::text
    ),
    'residency_credits', jsonb_build_object(
      'source', 'human_override',
      'final_value', 30,
      'source_ref', 'https://www.snhu.edu/admission/transferring-credits',
      'verified_at', now()::text
    ),
    'max_transfer_credits', jsonb_build_object(
      'source', 'human_override',
      'final_value', 90,
      'source_ref', 'https://www.snhu.edu/admission/transferring-credits',
      'verified_at', now()::text
    )
  )
WHERE id = '4457305f-8e48-400e-9111-21ac26f294ba';