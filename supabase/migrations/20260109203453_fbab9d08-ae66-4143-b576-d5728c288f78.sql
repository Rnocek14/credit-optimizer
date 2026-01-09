-- Update PHOENIX/STRAYER/UMGC to program-scoped for residency
UPDATE institutions 
SET transfer_policy_scope = 'program' 
WHERE code IN ('PHOENIX', 'STRAYER', 'UMGC');