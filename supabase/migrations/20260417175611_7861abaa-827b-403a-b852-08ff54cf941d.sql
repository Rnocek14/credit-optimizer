UPDATE public.institution_policy_packs
SET policy_data = policy_data || jsonb_build_object(
  'max_transfer_alt_combined_credits', 90,
  'confidence', 0.81,
  'provenance_verified_at', now()::text,
  'provenance_verified_by', 'human_review_after_machine_extraction',
  'provenance_source_url', 'https://www.snhu.edu/admission/transferring-credits'
),
field_provenance = COALESCE(field_provenance, '{}'::jsonb) || jsonb_build_object(
  'max_transfer_alt_combined_credits', jsonb_build_object(
    'source', 'human_override',
    'final_value', 90,
    'source_ref', 'https://www.snhu.edu/admission/transferring-credits',
    'note', 'SNHU has a single 90-credit transfer ceiling that includes alt credits.',
    'verified_at', now()::text
  )
)
WHERE id = '4457305f-8e48-400e-9111-21ac26f294ba';