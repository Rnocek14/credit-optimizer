# Scale-Readiness System Scan Runbook

This runbook verifies the promotion gate is correctly enforced at write-time AND read-time before scaling to more schools.

## Quick Verification Commands

### 1. Check Current Template Status Distribution

```sql
-- Run in Supabase SQL Editor
SELECT 
  status, 
  policy_status,
  COUNT(*) as count 
FROM degree_templates 
GROUP BY status, policy_status
ORDER BY status, policy_status;
```

**Expected**: All existing templates should have `status = 'active'` (default). After running the seeder with the new gate, you'll see:
- `active` + `green` = verified templates
- `pending_review` + `yellow` = templates needing verification
- No `blocked` rows should exist (blocked = no write)

### 2. Verify No Blocked Templates Leaked

```sql
-- Should return 0 rows
SELECT id, institution_code, status, policy_status, gate_reason 
FROM degree_templates 
WHERE status NOT IN ('active', 'pending_review');
```

### 3. Check Ground Truth Coverage

```sql
-- Shows which institutions have verified ground truth
SELECT 
  ipp.institution,
  ipp.status as pack_status,
  ipp.provenance_url IS NOT NULL as has_provenance_url,
  (ipp.policy_data->>'provenance_verified_at') IS NOT NULL as has_verified_at,
  (
    SELECT COUNT(*) 
    FROM jsonb_each(ipp.field_provenance) fp 
    WHERE (fp.value->>'source') IN ('ground_truth', 'human_override')
  ) as ground_truth_fields
FROM institution_policy_packs ipp
WHERE ipp.status = 'active'
ORDER BY ground_truth_fields DESC, ipp.institution;
```

---

## Acceptance Tests (Must Pass Before Scaling)

### Test 1: Scoring Bug Fix (No Auto-Award)

**Setup**: Create a policy with all critical fields but NO optional fields.

```sql
-- Check a policy with minimal optional coverage
SELECT 
  institution,
  (policy_data->>'transfer_alt_bucket_mode') as bucket_mode,
  (policy_data->>'degree_credit_total')::int as total,
  (policy_data->>'residency_credits')::int as residency,
  (policy_data->>'upper_division_min') as upper_div, -- optional
  (policy_data->>'capstone_in_residence') as capstone -- optional
FROM institution_policy_packs 
WHERE status = 'active';
```

**Verification**: Call the edge function and check logs:
- Score should be ~55-80 (critical + conditional only)
- WITHOUT ground truth → `yellow` (pending_review)
- WITH ground truth + score ≥80 → `green` (active)

### Test 2: Green Requires Ground Truth

```sql
-- Find institutions with complete policies but no ground truth
SELECT 
  ipp.institution,
  ipp.provenance_url,
  (ipp.policy_data->>'provenance_verified_at') as verified_at
FROM institution_policy_packs ipp
WHERE ipp.status = 'active'
  AND (ipp.policy_data->>'transfer_alt_bucket_mode') IS NOT NULL
  AND (ipp.policy_data->>'transfer_alt_bucket_mode') != 'unknown'
  AND ipp.provenance_url IS NULL
  AND (ipp.policy_data->>'provenance_verified_at') IS NULL;
```

**Expected**: These institutions should produce `pending_review` templates, NOT `active`.

### Test 3: Gate Enforced in seed-bsba-templates

**Setup**: Force a red policy by temporarily setting `bucket_mode = 'unknown'`:

```sql
-- TEMPORARILY make a policy red (revert after test!)
UPDATE institution_policy_packs 
SET policy_data = jsonb_set(policy_data, '{transfer_alt_bucket_mode}', '"unknown"')
WHERE institution = 'TEST_INST' AND status = 'active';
```

**Run**: Call `seed-bsba-templates` for that institution.

**Verify**:
1. Check edge function logs for `⛔ BLOCKED`
2. Query `policy_pack_events` for `template_generation_blocked` event
3. Confirm 0 new templates created for that institution

```sql
SELECT event_type, payload->>'reason', created_at
FROM policy_pack_events
WHERE institution = 'TEST_INST'
  AND event_type = 'template_generation_blocked'
ORDER BY created_at DESC LIMIT 1;
```

### Test 4: Gate Enforced in template-generation-worker

**Setup**: Queue a job for a program whose institution lacks an active policy pack.

**Run**: Invoke `template-generation-worker` with that institution.

**Verify** in logs:
- `⛔ BLOCKED: {INST} - No active policy pack found`
- Error code: `NO_POLICY_PACK` or `POLICY_GATE_BLOCKED`
- 0 templates written

### Test 5: Shared Helper (No Drift)

```bash
# Search codebase - should find exactly ONE implementation
grep -r "function evaluatePolicyGate" supabase/functions/
```

**Expected**: Only in `supabase/functions/_shared/policyGate.ts`

Both edge functions should import from this shared location:
```typescript
import { evaluatePolicyGate } from '../_shared/policyGate.ts';
```

### Test 6: Read-Path Filtering

```sql
-- Verify user-facing queries filter by status='active'
-- These are the hooks that matter:

-- useMarketplaceTemplates.ts - line ~347
-- useDegreeTemplates.ts - line ~38
-- useMarketplaceTemplate.ts (single) - line ~655
```

**Verify in code**:
```typescript
.eq('status', 'active') // Must exist in all user-facing queries
```

**Database verification**:
```sql
-- Insert a test pending template and verify it doesn't appear in app
INSERT INTO degree_templates (
  id, institution_id, institution_code, program_code, program_name,
  track_type, total_credits, template_data, status, policy_status, gate_reason
) VALUES (
  'TEST-PENDING-001',
  (SELECT id FROM institutions LIMIT 1),
  'TEST',
  'BSBA',
  'Test Program',
  'standard',
  120,
  '{"version":"test"}',
  'pending_review',
  'yellow',
  'Test - should not appear in UX'
);

-- Verify it exists
SELECT * FROM degree_templates WHERE id = 'TEST-PENDING-001';

-- App should NOT show this template (status filter)
-- Clean up after test:
DELETE FROM degree_templates WHERE id = 'TEST-PENDING-001';
```

---

## Gate Status Reference

| Policy Status | hasGroundTruth | Score | Template Status | User Visible? |
|--------------|----------------|-------|-----------------|---------------|
| green | true | ≥80 | `active` | ✅ Yes |
| yellow | true | 50-79 | `pending_review` | ❌ No |
| yellow | false | any | `pending_review` | ❌ No |
| red | any | any | (blocked) | ❌ No write |

---

## Edge Function Entrypoints

| Function | Table Written | Gate Location |
|----------|---------------|---------------|
| `seed-bsba-templates` | `degree_templates` | Lines 1050-1095 |
| `template-generation-worker` | `program_templates` | Lines 325-390 |

Both import from: `supabase/functions/_shared/policyGate.ts`

---

## Post-Scaling Checklist

After onboarding a new institution:

1. ☐ Policy pack created with `status = 'draft'`
2. ☐ Critical fields populated (bucket_mode, degree_total, residency)
3. ☐ Conditional fields populated based on bucket_mode
4. ☐ Ground truth source documented (provenance_url or field_provenance)
5. ☐ Policy pack promoted to `status = 'active'`
6. ☐ Run `seed-bsba-templates` for institution
7. ☐ Verify templates created with `status = 'active'`
8. ☐ Templates visible in marketplace

---

## Troubleshooting

### "Template not appearing in app"
1. Check `status` column: `SELECT status FROM degree_templates WHERE institution_code = 'X'`
2. If `pending_review`: policy needs ground truth verification
3. If missing: check edge function logs for blocked event

### "Gate returned yellow but I expected green"
1. Check `hasGroundTruth`: Is provenance_url set? Is field_provenance populated?
2. Check score: Are optional fields missing? Score must be ≥80 for green.

### "Templates generated but nothing in DB"
1. Check for cap violations in logs: `FATAL: alt_max still violates cap`
2. Check for upsert errors in logs
