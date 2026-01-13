-- Add 'templates_generated' to allowed event types
ALTER TABLE policy_pack_events DROP CONSTRAINT policy_pack_events_type_check;

ALTER TABLE policy_pack_events ADD CONSTRAINT policy_pack_events_type_check 
CHECK (event_type = ANY (ARRAY[
  'scan_started', 'scan_completed', 'scan_failed',
  'merge_created', 'diffs_written', 'conflict_detected',
  'override_set', 'promotion_attempted', 'promoted', 'promote_blocked',
  'templates_generated'
]));