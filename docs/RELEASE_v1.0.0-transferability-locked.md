# Release: v1.0.0-transferability-locked

**Release Date:** 2026-01-19  
**Type:** Major milestone — V1 Transferability Launch  

---

## Summary

This release marks the official launch of the Transferability V1 system with:
- **3 approved institutions** (TESU, COSC, WGU)
- **Server-side scope enforcement** on all write paths
- **Frozen compliance audit** with documented verification

---

## What's Included

### Scope Enforcement
- V1 institution allowlist enforced frontend + backend
- 9 write-capable edge functions protected
- 403 `INSTITUTION_NOT_IN_V1_SCOPE` on blocked institutions
- No silent fallbacks or bypass routes

### Data Integrity
- Policy pack activation triggers (6 required fields)
- Provider normalization (CHECK constraint)
- Staleness threshold (180 days)
- Evidence freshness display

### Verification
- Direct-input guards: black-box verified
- Resolved guards: code-path verified
- QA harness: ready for admin black-box testing

### Documentation
- `docs/V1_COMPLIANCE_AUDIT.md` — Frozen compliance record
- `docs/V1_EXPANSION_PLAYBOOK.md` — Safe expansion guide

---

## Known Limitations

1. **Admin black-box tests pending** — QA harness available, execution pending
2. **V1 scope is synchronized config** — Two files must stay in sync
3. **Evidence backfill incomplete** — `last_verified_at` display-only impact

See `docs/V1_COMPLIANCE_AUDIT.md` §5 for full details.

---

## Excluded Institutions

| Institution | Reason |
|------------|--------|
| EXCELSIOR | Evidence coverage ~25% (below 50% threshold) |
| EMPIRE | Evidence coverage ~25% (below 50% threshold) |

See `docs/V1_EXPANSION_PLAYBOOK.md` for expansion criteria.

---

## Files Changed

### New Files
- `src/lib/degree/v1Scope.ts` — Frontend V1 scope config
- `supabase/functions/_shared/v1Scope.ts` — Backend V1 scope config
- `tests/adminV1ScopeHarness.ts` — Admin black-box test harness
- `docs/V1_COMPLIANCE_AUDIT.md` — Frozen compliance audit
- `docs/V1_EXPANSION_PLAYBOOK.md` — Expansion guide

### Modified Files
- `supabase/functions/_shared/policyGate.ts` — Imports from v1Scope.ts
- `src/lib/degree/useAvailableInstitutions.ts` — Uses isV1Institution()
- `tests/policyGate.test.ts` — Added sync check assertion

---

## Upgrade Notes

This is a **non-breaking** release. No migration required.

All existing functionality remains unchanged. The scope enforcement adds restrictions to write operations for non-V1 institutions.

---

## Verification Commands

```bash
# Unit tests
deno test tests/policyGate.test.ts --allow-env --allow-net

# Admin harness (requires environment setup)
deno run --allow-net --allow-env tests/adminV1ScopeHarness.ts
```

---

## Git Tag

```bash
git tag -a v1.0.0-transferability-locked -m "V1 Transferability Launch

Scope: TESU, COSC, WGU
Enforcement: 9 edge functions protected
Verification: Black-box + code-path verified

Docs:
- docs/V1_COMPLIANCE_AUDIT.md
- docs/V1_EXPANSION_PLAYBOOK.md

Known limitations documented in compliance audit §5."

git push origin v1.0.0-transferability-locked
```

---

*This release represents a controlled, audited milestone. Future scope changes require a new audit cycle per the expansion playbook.*
