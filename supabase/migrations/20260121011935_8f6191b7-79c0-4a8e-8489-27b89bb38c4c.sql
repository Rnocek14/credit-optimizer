-- Batch B: SOPHIA Legacy Short-Code Aliases
-- Links short codes (ACC202, BUS100, etc.) to their canonical source_courses
-- Note: provider_code_norm and alias_code_norm are generated columns

INSERT INTO source_course_aliases (
  provider_code, alias_code, source_course_id, confidence, alias_kind, evidence_url
)
VALUES
  -- Core Batch B (0.98 confidence - verified in credit_transfer_rules)
  ('SOPHIA', 'ACC202', 'bc7c12ec-57cc-4d0a-aa05-e7641e8c72e0', 0.98, 'legacy_short_code', 'manual-audit-batch-b'),  -- Managerial Accounting → SOPH-0079
  ('SOPHIA', 'ART101', 'ddc8cde2-21b6-4175-a5f6-5d8f48af18e9', 0.98, 'legacy_short_code', 'manual-audit-batch-b'),  -- Art History I → SOPH-0006
  ('SOPHIA', 'BUS100', '2bf69664-1a86-4284-8724-03393d296d93', 0.98, 'legacy_short_code', 'manual-audit-batch-b'),  -- Intro to Business → SOPH-0014
  ('SOPHIA', 'COMM101', 'ae594995-0121-42ff-92f9-185f0e9a6717', 0.98, 'legacy_short_code', 'manual-audit-batch-b'), -- Public Speaking → SOPH-0024
  ('SOPHIA', 'CRIT101', '5039c858-e8df-47fc-a40d-e6ac1bb11a91', 0.98, 'legacy_short_code', 'manual-audit-batch-b'), -- Critical Thinking → SOPH-0028
  ('SOPHIA', 'ENG101', 'cf5224ee-3156-42ac-b22d-4088c007221c', 0.98, 'legacy_short_code', 'manual-audit-batch-b'),  -- English Comp I → SOPH-0015
  ('SOPHIA', 'ENG102', 'd1c27c61-e135-491a-8383-fcd7e4efaf62', 0.98, 'legacy_short_code', 'manual-audit-batch-b'),  -- English Comp II → SOPH-0030
  ('SOPHIA', 'ENV101', 'a6a9816c-7085-4bd8-9031-5e63073a1c15', 0.98, 'legacy_short_code', 'manual-audit-batch-b'),  -- Environmental Science → SOPH-0016
  ('SOPHIA', 'SOC101', 'bb15fbdb-8493-494f-93c9-a95ea9755fda', 0.98, 'legacy_short_code', 'manual-audit-batch-b'),  -- Intro to Sociology → SOPH-0051
  ('SOPHIA', 'MAT101', '45686bae-997b-4533-8976-d31fb10979ee', 0.98, 'legacy_short_code', 'manual-audit-batch-b'),  -- College Algebra → SOPH-0001
  ('SOPHIA', 'PHIL101', '340a53f6-46b9-4db3-9778-470f8c6e3733', 0.98, 'legacy_short_code', 'manual-audit-batch-b'), -- Intro to Philosophy → SOPH-0021
  ('SOPHIA', 'STAT101', '3adef5f9-a942-47fb-86e8-5bf9b219263a', 0.98, 'legacy_short_code', 'manual-audit-batch-b'), -- Intro to Statistics → SOPH-0027
  -- Additional coverage (0.85-0.95 confidence)
  ('SOPHIA', 'CS101', 'fc7dd5ac-934e-4aa3-bb58-b215f6536d45', 0.90, 'legacy_short_code', 'manual-audit-batch-b'),    -- Intro to IT → SOPH-0029
  ('SOPHIA', 'ETH301', '8257a1da-b3fc-4e64-88d4-4d43551f30c2', 0.95, 'legacy_short_code', 'manual-audit-batch-b'),  -- Intro to Ethics → SOPH-0020
  ('SOPHIA', 'HUM101', 'ddc8cde2-21b6-4175-a5f6-5d8f48af18e9', 0.85, 'legacy_short_code', 'manual-audit-batch-b'),  -- Humanities → Art History I (approximate)
  ('SOPHIA', 'SCI101', 'a6a9816c-7085-4bd8-9031-5e63073a1c15', 0.85, 'legacy_short_code', 'manual-audit-batch-b'),  -- Science → Environmental Science (approximate)
  ('SOPHIA', 'ELEC100', '2bf69664-1a86-4284-8724-03393d296d93', 0.80, 'legacy_short_code', 'manual-audit-batch-b') -- Elective → Intro Business (loose)
ON CONFLICT (provider_code_norm, alias_code_norm) 
DO UPDATE SET 
  source_course_id = EXCLUDED.source_course_id,
  confidence = EXCLUDED.confidence,
  alias_kind = EXCLUDED.alias_kind,
  evidence_url = EXCLUDED.evidence_url,
  updated_at = now();