# V1 Expansion Playbook

**Purpose:** Step-by-step guide to safely add new institutions (EXCELSIOR, EMPIRE, or others) to V1 scope without reopening risk.

**Prerequisite:** V1 Compliance Audit frozen (`docs/V1_COMPLIANCE_AUDIT.md`)

---

## Pre-Expansion Checklist

Before starting expansion for any institution, verify ALL of the following:

### 1. Evidence Coverage Threshold
- [ ] Evidence coverage ≥ 50% verified transfer rules
- [ ] Query: `SELECT COUNT(*) FILTER (WHERE evidence_url IS NOT NULL) * 100.0 / COUNT(*) FROM credit_transfer_rules WHERE target_institution = '<CODE>'`
- [ ] Document actual percentage in expansion ticket

### 2. Policy Pack Readiness
- [ ] Active policy pack exists for institution
- [ ] All 6 required fields populated:
  - [ ] `residency_credits`
  - [ ] `max_transfer_credits`
  - [ ] `transfer_alt_bucket_mode` (must be 'separate' or 'combined')
  - [ ] `degree_credit_total`
  - [ ] `provenance_verified_at`
  - [ ] `capstone_in_residence`
- [ ] Query: `SELECT * FROM institution_policy_packs WHERE institution = '<CODE>' AND status = 'active'`

### 3. Provider Normalization
- [ ] No deprecated provider codes in transfer rules
- [ ] Query: `SELECT DISTINCT source_institution FROM credit_transfer_rules WHERE target_institution = '<CODE>'`
- [ ] All providers match canonical format (e.g., `STUDYCOM` not `STUDY_COM`)

---

## Expansion Steps

### Step 1: Update V1 Scope Configs

**Files to modify (BOTH required):**

#### Frontend: `src/lib/degree/v1Scope.ts`
```typescript
// Before
export const V1_ALLOWED_INSTITUTIONS_LIST = ['TESU', 'COSC', 'WGU'] as const;

// After (example adding EXCELSIOR)
export const V1_ALLOWED_INSTITUTIONS_LIST = ['TESU', 'COSC', 'WGU', 'EXCELSIOR'] as const;
```

#### Backend: `supabase/functions/_shared/v1Scope.ts`
```typescript
// Before
export const V1_ALLOWED_INSTITUTIONS_LIST = ['TESU', 'COSC', 'WGU'] as const;

// After (example adding EXCELSIOR)
export const V1_ALLOWED_INSTITUTIONS_LIST = ['TESU', 'COSC', 'WGU', 'EXCELSIOR'] as const;
```

> ⚠️ **CRITICAL:** Both files MUST be updated. A mismatch creates scope drift.

---

### Step 2: Update Test Sync Check

**File:** `tests/policyGate.test.ts`

Update the sync check assertion:
```typescript
// Before
const expected = ['TESU', 'COSC', 'WGU'];

// After
const expected = ['TESU', 'COSC', 'WGU', 'EXCELSIOR'];
```

---

### Step 3: Run Unit Tests

```bash
deno test tests/policyGate.test.ts --allow-env --allow-net
```

**Expected:** All tests pass, including sync check.

---

### Step 4: Verify Direct-Input Guards (Regression)

For each existing V1 institution, confirm guards still work:

```bash
# Set up environment
export SUPABASE_URL="https://<project-ref>.supabase.co"
export SUPABASE_ANON_KEY="<anon-key>"
export ADMIN_EMAIL="qa-admin@yourdomain.com"
export ADMIN_PASSWORD="<password>"

# Test that blocked institutions are STILL blocked
export BLOCKED_PACK_ID="<uuid-of-empire-pack>"  # if adding EXCELSIOR, use EMPIRE
deno run --allow-net --allow-env tests/adminV1ScopeHarness.ts
```

**Expected:** 403 for institutions NOT being added.

---

### Step 5: Verify New Institution Access

Create a test request for the new institution:

```bash
# Example: Testing that EXCELSIOR now passes (after adding to scope)
curl -X POST "${SUPABASE_URL}/functions/v1/template-job-processor" \
  -H "Content-Type: application/json" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${ADMIN_JWT}" \
  -d '{"institution_code": "EXCELSIOR", "dry_run": true}'
```

**Expected:** 200 (not 403)

---

### Step 6: Update Compliance Audit

Create new audit entry in `docs/V1_COMPLIANCE_AUDIT.md`:

1. Move new institution from "Excluded" to "Approved" table
2. Add revision history entry:
   ```markdown
   | 2026-XX-XX | Added EXCELSIOR to V1 scope | <Author> |
   ```
3. Update evidence coverage percentage

---

## Rollback Procedure

If expansion causes issues:

1. **Revert scope configs** — Remove institution from both v1Scope.ts files
2. **Revert test sync check** — Update expected array
3. **Deploy** — Edge functions auto-deploy on push
4. **Verify** — Run harness to confirm institution is blocked again

---

## Institution-Specific Notes

### EXCELSIOR
- **Current Coverage:** ~25%
- **Blocking Issues:**
  - Evidence coverage below 50%
  - Policy pack may need field completion
- **Action Required:** Backfill evidence URLs, verify pack fields

### EMPIRE
- **Current Coverage:** ~25%
- **Blocking Issues:**
  - Evidence coverage below 50%
  - May share policies with EXCELSIOR (verify independence)
- **Action Required:** Backfill evidence URLs, confirm policy independence

---

## Post-Expansion Verification

After expansion is complete:

- [ ] All unit tests pass
- [ ] Admin harness regression passes (blocked institutions still blocked)
- [ ] New institution can create templates (dry_run test)
- [ ] UI shows new institution in selector
- [ ] Compliance audit updated with new institution
- [ ] Expansion ticket closed with evidence links

---

## Expansion Approval Checklist

Before merging expansion PR:

| Requirement | Status |
|------------|--------|
| Evidence coverage ≥ 50% | ☐ |
| Policy pack active with all fields | ☐ |
| Both v1Scope.ts files updated | ☐ |
| Test sync check updated | ☐ |
| Unit tests pass | ☐ |
| Regression harness pass | ☐ |
| New institution access verified | ☐ |
| Compliance audit updated | ☐ |

---

*This playbook ensures controlled expansion without reopening V1 security guarantees.*
