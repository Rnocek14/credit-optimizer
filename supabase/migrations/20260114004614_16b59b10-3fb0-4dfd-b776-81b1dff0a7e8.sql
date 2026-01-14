-- Delete stale WGU cost snapshots so edge function can insert fresh with correct planWeeks
DELETE FROM template_cost_snapshots 
WHERE template_id LIKE 'WGU-BSBA%V2';