-- Backfill legacy templates created before policy gate with metadata
UPDATE degree_templates
SET
  policy_status = 'green',
  gate_reason = 'Legacy template created before policy gate; treated as green until regenerated'
WHERE policy_status IS NULL;