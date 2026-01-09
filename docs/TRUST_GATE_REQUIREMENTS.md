# Institution Policy Pack Trust Gate Requirements

## Overview

The `validate_policy_pack_active_status` trigger enforces strict requirements before a policy pack can be promoted to `status = 'active'`.

## Gate Requirements

### Gate 1: Required Fields Exist
Both `residency_credits` and `max_transfer_credits` must be present in `policy_data`.

### Gate 2-5: Provenance Validation
The trigger checks **flat provenance keys** (not nested paths):

```sql
-- Trigger checks these paths:
field_provenance->'residency_credits'->>'source'
field_provenance->'max_transfer_credits'->>'source'
```

**Accepted provenance values:**
- `ground_truth`
- `human_override`

**NOT accepted:**
- `ai_extraction` (default from scraper)

**Important:** The nested provenance paths like `residency_policy.min_institutional_credits` are NOT checked by the trigger. You must set BOTH:
- Flat keys: `residency_credits`, `max_transfer_credits`
- (Optional) Nested keys for display consistency

### Gate 6: Ground Truth Must Exist
A corresponding row must exist in `institution_policy_ground_truth` for the institution.

```sql
SELECT EXISTS (
  SELECT 1 FROM institution_policy_ground_truth
  WHERE institution = NEW.institution
)
```

## Promotion Workflow

To promote a pack from `draft` to `active`:

### Step 1: Insert/Update Ground Truth
```sql
INSERT INTO institution_policy_ground_truth (
  institution,
  academic_year,
  residency_credits,
  max_transfer_credits,
  source_url,
  verified_by,
  last_verified_at,
  notes
) VALUES (
  'INSTITUTION_CODE',
  '2024-2025',
  30,  -- residency credits
  90,  -- max transfer credits
  'https://evidence-url...',
  'human_review_from_ai_extraction',
  NOW(),
  'Description of verification'
)
ON CONFLICT (institution, academic_year) DO UPDATE SET ...;
```

### Step 2: Update Provenance to Human Override
```sql
UPDATE institution_policy_packs
SET field_provenance = jsonb_set(
  jsonb_set(
    field_provenance,
    '{residency_credits,source}',
    '"human_override"'::jsonb
  ),
  '{max_transfer_credits,source}',
  '"human_override"'::jsonb
)
WHERE id = '<PACK_ID>';
```

### Step 3: Promote Status
```sql
UPDATE institution_policy_packs
SET status = 'active'
WHERE id = '<PACK_ID>';
```

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "Activation requires ground_truth or human_override provenance" | Flat provenance keys still show `ai_extraction` | Update `field_provenance->'residency_credits'->>'source'` |
| "No ground truth found" | Gate 6 check failed | Insert row into `institution_policy_ground_truth` |
| "Missing required fields" | `policy_data` incomplete | Ensure both caps exist in pack |

## Verification Query

Check if a pack is ready for promotion:

```sql
SELECT 
  id,
  institution,
  status,
  policy_data->>'residency_credits' AS residency,
  policy_data->>'max_transfer_credits' AS max_transfer,
  field_provenance->'residency_credits'->>'source' AS residency_prov,
  field_provenance->'max_transfer_credits'->>'source' AS max_transfer_prov,
  EXISTS (
    SELECT 1 FROM institution_policy_ground_truth gt
    WHERE gt.institution = ipp.institution
  ) AS has_ground_truth
FROM institution_policy_packs ipp
WHERE institution = 'TARGET_INSTITUTION'
ORDER BY created_at DESC
LIMIT 1;
```
