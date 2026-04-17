INSERT INTO public.institution_v1_scope (institution_code, evidence_coverage_pct, notes)
VALUES
  ('SNHU',    0, 'V2 expansion - dry-run validated 2026-04-17, extraction confidence 49-69'),
  ('ASUO',    0, 'V2 expansion - dry-run validated 2026-04-17, extraction confidence 67-71'),
  ('LIBERTY', 0, 'V2 expansion - dry-run validated 2026-04-17, extraction confidence 67-75'),
  ('UMGC',    0, 'V2 expansion - dry-run validated 2026-04-17, extraction confidence 85 (auto-approve tier)'),
  ('GCU',     0, 'V2 expansion - dry-run validated 2026-04-17, extraction confidence 65-76 (some bot-blocked pages)')
ON CONFLICT (institution_code) DO NOTHING;