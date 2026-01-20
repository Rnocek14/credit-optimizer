# Release: v1.0.1-transferability-closed

**Release Date:** 2026-01-20  
**Type:** Major milestone — V1 Transferability Enforcement Closed  

---

## Summary

This release completes the V1 Transferability enforcement closure with:
- **5 approved institutions** (TESU, COSC, WGU, EXCELSIOR, EMPIRE)
- **10/10 write-capable endpoints protected** (including skip-guard on evidence-backfill-worker)
- **Black-box verified skip-guard** with execution proof artifact

---

## What's Included

### Scope Enforcement
- V1 institution allowlist enforced frontend + backend
- 10 write-capable edge functions protected (was 9, +1 evidence-backfill-worker)
- 403 `INSTITUTION_NOT_IN_V1_SCOPE` on blocked institutions (direct guards)
- Skip-guard pattern for queue-based workers (non-V1 jobs skipped with telemetry)

### Evidence Coverage (V1 Gate: ≥50%)
| Institution | Coverage | Status |
|-------------|----------|--------|
| TESU | 78.8% | ✅ Approved |
| COSC | 83.1% | ✅ Approved |
| WGU | 56.9% | ✅ Approved |
| EXCELSIOR | 50.8% | ✅ Approved |
| EMPIRE | 53.8% | ✅ Approved |

### Data Integrity
- Policy pack activation triggers (6 required fields)
- Provider normalization (CHECK constraint blocks STUDY_COM)
- Staleness threshold (24 months / 180 days UI)
- Evidence source type constraint (5 allowed values)

### Verification
- Direct-input guards (7 endpoints): black-box verified
- Resolved guards (2 endpoints): code-path verified, harness ready
- Skip-guard (1 endpoint): **black-box verified** with execution proof
- DB constraints: verified via pg_constraint queries

### Documentation
- `docs/V1_COMPLIANCE_AUDIT.md` — Updated with execution proof + QA regression steps
- `docs/V1_EXPANSION_PLAYBOOK.md` — Safe expansion guide

---

## Changes from v1.0.0

| Change | Details |
|--------|---------|
| +EXCELSIOR | Evidence backfill to 50.8% (Tier-1 source) |
| +EMPIRE | Evidence backfill to 53.8% (Tier-1 source) |
| +evidence-backfill-worker guard | Skip-guard pattern for non-V1 institutions |
| +Execution proof | Black-box verification with request ID |
| +QA regression steps | SQL + curl commands for future verification |

---

## Files Changed

### Modified Files
- `src/lib/degree/v1Scope.ts` — Added EXCELSIOR, EMPIRE
- `supabase/functions/_shared/v1Scope.ts` — Added EXCELSIOR, EMPIRE
- `supabase/functions/evidence-backfill-worker/index.ts` — Added V1 scope skip-guard
- `tests/policyGate.test.ts` — Updated sync assertion
- `docs/V1_COMPLIANCE_AUDIT.md` — Added execution proof + QA steps

---

## Verification Commands

```bash
# Unit tests
deno test tests/policyGate.test.ts --allow-env --allow-net

# Admin harness (requires environment setup)
deno run --allow-net --allow-env tests/adminV1ScopeHarness.ts

# Skip-guard verification (see docs/V1_COMPLIANCE_AUDIT.md §3)
curl -X POST "$SUPABASE_URL/functions/v1/evidence-backfill-worker" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -d '{"batch_size": 5}'
```

---

## Git Tag

```bash
git tag -a v1.0.1-transferability-closed -m "V1 Transferability Enforcement Closed

Scope: TESU, COSC, WGU, EXCELSIOR, EMPIRE (5 institutions)
Enforcement: 10/10 write-capable endpoints protected
Verification: Black-box verified (direct + skip-guard)

Key changes:
- Added EXCELSIOR + EMPIRE via evidence backfill
- Added skip-guard to evidence-backfill-worker
- Execution proof with request_id: 019bdd20-ae6c-76bd-ac0d-ea4eb523d18c

Docs:
- docs/V1_COMPLIANCE_AUDIT.md (updated)
- docs/V1_EXPANSION_PLAYBOOK.md"

git push origin v1.0.1-transferability-closed
```

---

*V1 enforcement is now fully closed. All write paths are protected. Future scope changes require a new audit cycle per the expansion playbook.*
