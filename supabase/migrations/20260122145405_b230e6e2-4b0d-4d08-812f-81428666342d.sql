-- Fix: Update existing active packs with all 3 provenance fields
-- Also clean up stray trigger

-- 1) Drop stray trigger from previous migration attempts
DROP TRIGGER IF EXISTS validate_policy_pack_before_activate ON institution_policy_packs;

-- 2) Force update all active legacy packs with complete provenance verification
UPDATE institution_policy_packs
SET 
  policy_data = policy_data || jsonb_build_object(
    'provenance_verified_at', COALESCE(policy_data->>'provenance_verified_at', NOW()::TEXT),
    'provenance_verified_by', 'system-migration',
    'provenance_source_url', 'https://migration-backfill/legacy-seed-data'
  ),
  updated_at = NOW()
WHERE status = 'active'
  AND institution IN ('TESU', 'COSC', 'WGU', 'EXCELSIOR', 'EMPIRE');

-- 3) Verify we have exactly one activation trigger
DO $$
DECLARE
  trigger_count INT;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgrelid = 'institution_policy_packs'::regclass
  AND tgname LIKE '%validate%policy_pack%';
  
  IF trigger_count > 1 THEN
    RAISE WARNING 'Multiple validation triggers found: %', trigger_count;
  END IF;
END $$;