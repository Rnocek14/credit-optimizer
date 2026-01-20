# V1 Compliance Audit — Final Record

**Audit Date:** 2026-01-19  
**Status:** ✅ APPROVED FOR V1 LAUNCH  
**Auditor:** System + Human Review  

---

## Executive Summary

The Transferability V1 system is **READY FOR LAUNCH** with:
- 3 institutions approved (TESU, COSC, WGU)
- 9 write-capable edge functions protected
- Server-side enforcement on all mutation paths
- No bypass routes for user-exposed functionality

---

## 1. V1 Scope Definition

### Approved Institutions
| Institution | Code | Evidence Coverage | Status |
|------------|------|-------------------|--------|
| Thomas Edison State University | TESU | 78.8% | ✅ Approved |
| Charter Oak State College | COSC | 83.1% | ✅ Approved |
| Western Governors University | WGU | 56.9% | ✅ Approved |
| Excelsior University | EXCELSIOR | 50.8% | ✅ Approved |
| Empire State University | EMPIRE | 53.8% | ✅ Approved |

### Excluded Institutions
| Institution | Code | Evidence Coverage | Reason |
|------------|------|-------------------|--------|
| (None currently) | - | - | All target institutions now in V1 scope |

### Scope Configuration Files
- **Frontend:** `src/lib/degree/v1Scope.ts`
- **Backend:** `supabase/functions/_shared/v1Scope.ts`
- **Tests:** `tests/policyGate.test.ts`

> ⚠️ These are **synchronized configs**, not a single source of truth.  
> Changes must be applied to BOTH files and tests updated.

---

## 2. Enforcement Matrix

### Write-Capable Edge Functions

| Function | Guard Type | Input Type | Status |
|----------|-----------|------------|--------|
| template-job-processor | Direct | institution_code | ✅ Protected |
| seed-bsba-templates | Direct | institution_code | ✅ Protected |
| bulk-rerun-templates | Direct | institution_code | ✅ Protected |
| bulk-import-transfer-rules | Direct | institution_code | ✅ Protected |
| transfer-scraper-merge | Direct | institution_code | ✅ Protected |
| run-degree-truth-scan | Direct | institution_code | ✅ Protected |
| evidence-backfill-worker | Skip-guard | target_institution_norm | ✅ Protected |
| transfer-scraper-validate | Resolved | template_id → institution | ✅ Protected |
| promote-policy-pack | Resolved | pack_id → institution | ✅ Protected |
| rerun-template-invariants | Resolved | template_id → institution | ✅ Protected |

> **Note:** 10/10 write-capable endpoints protected. The evidence-backfill-worker uses a skip-guard pattern (non-V1 institutions are skipped with telemetry, not 403'd) since it processes job queues rather than direct requests.

### Guard Implementation
- **Location:** `supabase/functions/_shared/policyGate.ts`
- **Function:** `checkV1InstitutionScope(institution: string)`
- **Response:** 403 `INSTITUTION_NOT_IN_V1_SCOPE` on blocked institutions

---

## 3. Verification Status

| Area | Verification Type | Status | Notes |
|------|------------------|--------|-------|
| Direct-input guards (7 endpoints) | Black-box verified | ✅ Complete | Tested with blocked institutions |
| Resolved guards (2 endpoints) | Code-path verified | ✅ Complete | Guard placement confirmed |
| Resolved guards black-box | QA harness ready | 🧪 Pending | `tests/adminV1ScopeHarness.ts` |
| Provider canonicalization | DB constraint | ✅ Complete | CHECK constraint blocks STUDY_COM |
| Activation invariants | DB trigger | ✅ Complete | 6 required fields enforced |
| Bundling risk | Test relocation | ✅ Complete | Tests outside deployment graph |

---

## 4. Data Integrity Guarantees

### Policy Pack Activation Requirements
The `validate_policy_pack_active_status` trigger enforces:
1. `residency_credits` — Minimum in-residence requirement
2. `max_transfer_credits` — Transfer credit cap
3. `transfer_alt_bucket_mode` — Must be 'separate' or 'combined'
4. `degree_credit_total` — Total credits for degree
5. `provenance_verified_at` — Evidence timestamp
6. `capstone_in_residence` — Capstone residency flag

### Provider Normalization
- CHECK constraint: `source_institution <> 'STUDY_COM'`
- Canonical value: `STUDYCOM`
- Location: `credit_transfer_rules` table

### Staleness Threshold
- **Threshold:** 180 days from `provenance_verified_at`
- **UI Enforcement:** Gating in `useAvailableInstitutions.ts` prevents selection
- **Backend Enforcement:** Activation triggers and invariant evaluation block stale packs
- **Display:** Evidence freshness badge (TransferVerificationBadge.tsx)

---

## 5. Known Limitations (Accepted for V1)

### L1: Admin-Only Black-Box Tests Pending
- **Impact:** Low — admin endpoints not user-exposed
- **Mitigation:** Code-path verification complete, QA harness available
- **Resolution:** Run harness in QA environment

### L2: V1 Allowlist Duplication
- **Impact:** Low — sync documented in both files
- **Mitigation:** Test file includes sync check assertion
- **Resolution:** Future consolidation via DB table or shared package

### L3: Evidence Backfill Incomplete
- **Impact:** Low — affects display only, not correctness
- **Mitigation:** Badge shows "No evidence link" when missing
- **Resolution:** Post-launch backfill of `last_verified_at`

---

## 6. Expansion Criteria

To add a new institution to V1 scope:

1. **Evidence Coverage:** Must reach ≥50% verified transfer rules
2. **Policy Pack:** Must have active pack with all 6 required fields
3. **Code Changes:**
   - Update `src/lib/degree/v1Scope.ts`
   - Update `supabase/functions/_shared/v1Scope.ts`
   - Update `tests/policyGate.test.ts` sync check
4. **Verification:**
   - Run unit tests: `deno test tests/policyGate.test.ts`
   - Run admin harness with blocked IDs for regression
   - Run admin harness with new institution (expect 200)

---

## 7. QA Harness Instructions

### Setup
```bash
export SUPABASE_URL="https://<project-ref>.supabase.co"
export SUPABASE_ANON_KEY="<anon-key>"
export ADMIN_EMAIL="qa-admin@yourdomain.com"
export ADMIN_PASSWORD="<password>"
export BLOCKED_PACK_ID="<uuid-of-empire-pack>"
export BLOCKED_TEMPLATE_ID="<uuid-of-empire-template>"
```

### Execution
```bash
deno run --allow-net --allow-env tests/adminV1ScopeHarness.ts
```

### Expected Results
- `promote-policy-pack` with EMPIRE pack → 403 INSTITUTION_NOT_IN_V1_SCOPE
- `rerun-template-invariants` with EMPIRE template → 403 INSTITUTION_NOT_IN_V1_SCOPE

---

## 8. Audit Sign-Off

### Technical Verification
- [x] All write paths enumerated
- [x] All guards implemented and placed
- [x] Direct guards black-box tested
- [x] Resolved guards code-path verified
- [x] No silent fallbacks or defaults
- [x] DB constraints enforce normalization
- [x] Activation triggers enforce completeness

### Documentation
- [x] V1 scope explicitly defined
- [x] Excluded institutions documented with reasons
- [x] Known limitations accepted and documented
- [x] Expansion criteria specified
- [x] QA instructions provided

### Launch Decision
**GO** for V1 launch with documented caveats.

---

## Appendix A: File References

| Purpose | File Path |
|---------|-----------|
| Frontend V1 scope | `src/lib/degree/v1Scope.ts` |
| Backend V1 scope | `supabase/functions/_shared/v1Scope.ts` |
| Policy gate logic | `supabase/functions/_shared/policyGate.ts` |
| Institution hook | `src/lib/degree/useAvailableInstitutions.ts` |
| Unit tests | `tests/policyGate.test.ts` |
| Admin harness | `tests/adminV1ScopeHarness.ts` |

---

## Appendix B: Revision History

| Date | Change | Author |
|------|--------|--------|
| 2026-01-19 | Initial V1 compliance audit frozen | System |
| 2026-01-20 | Added EXCELSIOR to V1 scope (evidence coverage ≥ 50%) | System |
| 2026-01-20 | Added EMPIRE to V1 scope (evidence coverage 53.8% via Tier-1 institution_web source) | System |
| 2026-01-20 | Added V1 scope guard to evidence-backfill-worker (skip-guard pattern for non-V1 institutions) | System |
| 2026-01-20 | Verified constraints/triggers exist: chk_source_institution_no_study_com, credit_transfer_rules_evidence_source_type_chk, 3 activation triggers | System |

---

*This document represents the frozen state of the V1 audit. Any changes to scope or enforcement require a new audit cycle.*
