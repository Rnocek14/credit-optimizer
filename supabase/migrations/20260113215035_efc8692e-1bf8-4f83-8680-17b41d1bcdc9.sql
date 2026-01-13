
-- Fix 2 COSC programs missing from template_generation_queue
INSERT INTO template_generation_queue (program_catalog_id, program_slug, eligibility_status, blocked_reasons, status, desired_tracks, priority_score)
SELECT 
  pc.id,
  pc.program_slug,
  (CASE 
    WHEN pc.is_licensure_program THEN 'blocked_licensure'
    WHEN pc.has_clinical_or_practicum THEN 'blocked_clinical'
    ELSE 'needs_review'
  END)::template_eligibility_status,
  CASE 
    WHEN pc.is_licensure_program THEN ARRAY['Requires professional licensure']
    WHEN pc.has_clinical_or_practicum THEN ARRAY['Requires clinical/practicum hours']
    ELSE ARRAY[]::text[]
  END,
  'queued',
  ARRAY['standard', 'alt_max'],
  50
FROM program_catalog pc
LEFT JOIN template_generation_queue q ON q.program_catalog_id = pc.id
WHERE q.id IS NULL
ON CONFLICT (program_catalog_id) DO NOTHING;
