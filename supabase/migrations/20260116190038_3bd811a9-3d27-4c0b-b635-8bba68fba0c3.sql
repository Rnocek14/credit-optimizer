-- Seed invariant_decision_snapshots for E2E QA testing
-- Creates 100+ snapshots across 60+ templates with realistic distribution

-- First, seed some template_generation_jobs to reference (status must be queued/running/succeeded/failed/canceled)
INSERT INTO template_generation_jobs (id, institution, program_code, status, priority, attempt_count, max_attempts, run_after, created_at, updated_at, completed_at)
VALUES
  ('11111111-1111-1111-1111-111111111101', 'COSC', 'CS-BA', 'succeeded', 1, 1, 3, now() - interval '10 days', now() - interval '10 days', now() - interval '9 days', now() - interval '9 days'),
  ('11111111-1111-1111-1111-111111111102', 'COSC', 'CS-BS', 'succeeded', 1, 1, 3, now() - interval '8 days', now() - interval '8 days', now() - interval '7 days', now() - interval '7 days'),
  ('11111111-1111-1111-1111-111111111103', 'COSC', 'DATA-BS', 'succeeded', 1, 1, 3, now() - interval '6 days', now() - interval '6 days', now() - interval '5 days', now() - interval '5 days'),
  ('11111111-1111-1111-1111-111111111104', 'TEST', 'TEST-BA', 'succeeded', 1, 1, 3, now() - interval '4 days', now() - interval '4 days', now() - interval '3 days', now() - interval '3 days'),
  ('11111111-1111-1111-1111-111111111105', 'TEST', 'TEST-BS', 'succeeded', 1, 1, 3, now() - interval '2 days', now() - interval '2 days', now() - interval '1 day', now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

-- Generate 60 synthetic template UUIDs and insert 100+ snapshots
WITH 
template_ids AS (
  SELECT 'a3daade4-04b5-40be-9d7a-2be06e1ed86d'::uuid AS tid, 'COSC' AS inst, 'main' AS trk UNION ALL
  SELECT 'e2f6e92a-0553-4061-aaf6-f55006874738'::uuid, 'COSC', 'main' UNION ALL
  SELECT '0136c708-0de3-4a79-8af4-9928e0d3eb4b'::uuid, 'COSC', 'accelerated' UNION ALL
  SELECT 'b6717eec-9155-4238-a56c-0488001ab415'::uuid, 'COSC', 'main' UNION ALL
  SELECT 'cb451dc0-cfd4-4872-a2f6-3ef2d3e0929c'::uuid, 'COSC', 'evening' UNION ALL
  SELECT '2322cfa2-4f44-4854-b7f2-6d8c0410e83f'::uuid, 'COSC', 'main' UNION ALL
  SELECT '70958e1d-9f3b-4fda-8dfb-9db85a777e44'::uuid, 'COSC', 'accelerated' UNION ALL
  SELECT '35e60b7d-4a4b-4ccd-b279-3fb493cd82f2'::uuid, 'COSC', 'main' UNION ALL
  SELECT 'a3f5a574-7dba-4297-9f34-0347c2863109'::uuid, 'COSC', 'evening' UNION ALL
  SELECT gen_random_uuid(), 'COSC', 'main' FROM generate_series(1, 17) UNION ALL
  SELECT gen_random_uuid(), 'COSC', 'accelerated' FROM generate_series(1, 10) UNION ALL
  SELECT gen_random_uuid(), 'TEST', 'main' FROM generate_series(1, 12) UNION ALL
  SELECT gen_random_uuid(), 'TEST', 'evening' FROM generate_series(1, 6) UNION ALL
  SELECT gen_random_uuid(), 'DEMO', 'main' FROM generate_series(1, 6)
),
numbered_templates AS (
  SELECT tid, inst, trk, ROW_NUMBER() OVER () AS rn FROM template_ids
),
snapshots_data AS (
  -- First snapshot for each template (older)
  SELECT 
    tid AS template_id, inst AS institution_code, trk AS track,
    CASE WHEN rn <= 36 THEN 'pass' WHEN rn <= 51 THEN 'warn' ELSE 'block' END AS decision,
    CASE WHEN rn <= 36 THEN '{}'::text[] WHEN rn <= 51 THEN ARRAY['WARN_CREDIT_VARIANCE', 'WARN_MISSING_PREREQ'] ELSE ARRAY['BLOCK_ZERO_CREDITS', 'BLOCK_MISSING_CORE', 'BLOCK_DUPLICATE_COURSE'] END AS violation_codes,
    'v1.0.0' AS invariant_version,
    '{"rules_version": "1.0"}'::jsonb AS effective_config,
    'published' AS template_status,
    CASE WHEN rn <= 15 THEN '11111111-1111-1111-1111-111111111101'::uuid WHEN rn <= 30 THEN '11111111-1111-1111-1111-111111111102'::uuid ELSE NULL END AS job_id,
    now() - interval '5 days' + (rn * interval '1 minute') AS created_at
  FROM numbered_templates
  
  UNION ALL
  
  -- Second snapshot for first 30 templates (newer)
  SELECT 
    tid, inst, trk,
    CASE WHEN rn <= 18 THEN 'pass' WHEN rn <= 25 THEN 'warn' ELSE 'block' END,
    CASE WHEN rn <= 18 THEN '{}'::text[] WHEN rn <= 25 THEN ARRAY['WARN_CREDIT_VARIANCE'] ELSE ARRAY['BLOCK_ZERO_CREDITS', 'BLOCK_MISSING_CORE'] END,
    'v1.1.0', '{"rules_version": "1.1"}'::jsonb, 'published',
    CASE WHEN rn <= 10 THEN '11111111-1111-1111-1111-111111111103'::uuid WHEN rn <= 20 THEN '11111111-1111-1111-1111-111111111104'::uuid ELSE '11111111-1111-1111-1111-111111111105'::uuid END,
    now() - interval '2 days' + (rn * interval '30 seconds')
  FROM numbered_templates WHERE rn <= 30
  
  UNION ALL
  
  -- Third snapshot for first 10 templates - SAME created_at to test id DESC tiebreaker
  SELECT 
    tid, inst, trk, 'pass', '{}'::text[], 'v1.2.0', '{"rules_version": "1.2"}'::jsonb, 'published',
    '11111111-1111-1111-1111-111111111105'::uuid,
    now() - interval '1 day'  -- All 10 have SAME timestamp!
  FROM numbered_templates WHERE rn <= 10
)
INSERT INTO invariant_decision_snapshots (
  template_id, institution_code, track, decision, violation_codes, 
  invariant_version, effective_config, template_status, job_id, created_at
)
SELECT * FROM snapshots_data;