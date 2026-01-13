-- Add provenance_verified_at to policy_data and set proper field_provenance
UPDATE institution_policy_packs
SET 
  policy_data = jsonb_build_object(
    'accepts_ap', true,
    'accepts_clep', true,
    'accepts_dsst', true,
    'accepts_portfolio', true,
    'accepts_tecep', true,
    'capstone_required', true,
    'cornerstone_required', false,
    'max_ace_nccrs_credits', 90,
    'max_transfer_credits', 117,
    'residency_credits', 15,
    'degree_credit_total', 120,
    'transfer_alt_bucket_mode', 'separate',
    'max_alt_credit', 90,
    'provenance_verified_at', now()::text
  ),
  field_provenance = jsonb_build_object(
    'residency_credits', jsonb_build_object('source', 'ground_truth', 'confidence', 0.95),
    'max_transfer_credits', jsonb_build_object('source', 'ground_truth', 'confidence', 0.95)
  )
WHERE id = 'b22c3e08-9648-4bc9-80e2-be3836fd64bc';

-- Promote the pack
UPDATE institution_policy_packs
SET status = 'superseded', updated_at = now()
WHERE institution = 'TESU' AND status = 'active';

UPDATE institution_policy_packs
SET status = 'active', stale = false, updated_at = now()
WHERE id = 'b22c3e08-9648-4bc9-80e2-be3836fd64bc';

INSERT INTO policy_pack_events (institution, pack_id, event_type, payload)
VALUES ('TESU', 'b22c3e08-9648-4bc9-80e2-be3836fd64bc', 'promoted', '{"confidence_score": 86}'::jsonb);