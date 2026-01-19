# Evidence Backfill Plan

**Purpose:** Roadmap to bring EXCELSIOR and EMPIRE from ~25% to ≥50% evidence coverage, enabling V1 expansion per the playbook.

**Target:** Reach expansion-ready state for both institutions within defined timeline.

---

## Current State

| Institution | Transfer Rules | With Evidence | Coverage | Target | Gap |
|------------|---------------|---------------|----------|--------|-----|
| EXCELSIOR | ~400 (est) | ~100 | ~25% | ≥50% | ~100 rules |
| EMPIRE | ~400 (est) | ~100 | ~25% | ≥50% | ~100 rules |

> **Note:** Actual counts should be verified with:
> ```sql
> SELECT 
>   target_institution,
>   COUNT(*) as total_rules,
>   COUNT(evidence_url) as with_evidence,
>   ROUND(COUNT(evidence_url) * 100.0 / COUNT(*), 1) as coverage_pct
> FROM credit_transfer_rules
> WHERE target_institution IN ('EXCELSIOR', 'EMPIRE')
> GROUP BY target_institution;
> ```

---

## Evidence Sources (Priority Order)

### Tier 1: Official Institution Sources (Highest Trust)
1. **Transfer Credit Evaluation Guides**
   - EXCELSIOR: excelsior.edu/admissions/transfer-credit
   - EMPIRE: sunyempire.edu/transfer

2. **Published Equivalency Tables**
   - PDF catalogs with course-to-credit mappings
   - Partner institution agreements

3. **Registrar Published Policies**
   - Maximum credit limits
   - Provider-specific acceptance rules

### Tier 2: Third-Party Verification
1. **CLEP Official Score Recipients**
   - collegeboard.org CLEP policies by institution

2. **Sophia Learning Partner Pages**
   - sophia.org/partners (institution-specific)

3. **Study.com ACE Credit Pages**
   - study.com/academy/ace-credit

4. **ACE Credit Recommendations**
   - acenet.edu credit recommendations database

### Tier 3: Community Evidence
1. **Student Success Reports**
   - Reddit r/excelsior, r/WGU threads with screenshots
   - Facebook transfer credit groups

2. **Historical Acceptance Data**
   - Prior student transcripts (anonymized)
   - Advisor confirmation emails

> **Evidence Quality Rule:** Tier 1 > Tier 2 > Tier 3  
> Prioritize Tier 1/2 for initial 50% threshold.

---

## Backfill Strategy

### Phase 1: High-Impact Rules (Weeks 1-2)
**Goal:** Cover the most commonly used transfer paths first.

1. **Identify high-frequency providers**
   ```sql
   SELECT source_institution, COUNT(*) as rule_count
   FROM credit_transfer_rules
   WHERE target_institution = 'EXCELSIOR'
     AND evidence_url IS NULL
   GROUP BY source_institution
   ORDER BY rule_count DESC
   LIMIT 10;
   ```

2. **Prioritize by provider**
   - SOPHIA: High volume, easy to verify
   - STUDYCOM: Good documentation
   - CLEP: Official score recipient lists
   - DSST: Published acceptance policies

3. **Batch update pattern**
   ```sql
   UPDATE credit_transfer_rules
   SET 
     evidence_url = '<verified-url>',
     last_verified_at = NOW(),
     verified_by = 'backfill-v1'
   WHERE target_institution = 'EXCELSIOR'
     AND source_institution = 'SOPHIA'
     AND source_course_code = '<code>';
   ```

### Phase 2: Gap Closure (Weeks 3-4)
**Goal:** Reach 50% threshold systematically.

1. **Track progress daily**
   ```sql
   SELECT 
     DATE(last_verified_at) as verified_date,
     COUNT(*) as rules_verified
   FROM credit_transfer_rules
   WHERE target_institution = 'EXCELSIOR'
     AND last_verified_at IS NOT NULL
   GROUP BY DATE(last_verified_at)
   ORDER BY verified_date DESC;
   ```

2. **Focus on low-hanging fruit**
   - Rules where similar rules already have evidence
   - Rules from well-documented providers
   - Rules with high confidence scores

3. **Document unverifiable rules**
   - Mark as `evidence_status = 'unverifiable'`
   - Exclude from coverage calculation if appropriate

### Phase 3: Quality Assurance (Week 5)
**Goal:** Validate evidence quality before expansion.

1. **Spot-check sample**
   - Verify 10% of evidence URLs are still accessible
   - Confirm URLs actually support the claimed equivalency

2. **Run freshness check**
   ```sql
   SELECT COUNT(*) 
   FROM credit_transfer_rules
   WHERE target_institution = 'EXCELSIOR'
     AND evidence_url IS NOT NULL
     AND (last_verified_at IS NULL OR last_verified_at < NOW() - INTERVAL '180 days');
   ```

3. **Update stale evidence**
   - Re-verify URLs older than 180 days
   - Update `last_verified_at` timestamps

---

## Verification Workflow

### Per-Rule Evidence Process

1. **Locate source**
   - Search institution website
   - Check provider partner pages
   - Search ACE database

2. **Capture evidence**
   - Copy direct URL to policy/table
   - Screenshot if URL may change
   - Note page section/table row

3. **Update database**
   ```sql
   UPDATE credit_transfer_rules
   SET 
     evidence_url = 'https://...',
     evidence_excerpt = 'Section 4.2: SOPHIA courses accepted for...',
     last_verified_at = NOW(),
     verified_by = '<operator-id>'
   WHERE id = '<rule-id>';
   ```

4. **Log verification**
   - Record in backfill tracking spreadsheet
   - Include URL, date, verifier

---

## Progress Tracking

### Weekly Metrics

| Week | EXCELSIOR Coverage | EMPIRE Coverage | Rules Verified | Notes |
|------|-------------------|-----------------|----------------|-------|
| 0 | 25% | 25% | - | Baseline |
| 1 | - | - | - | Target: +10% |
| 2 | - | - | - | Target: +10% |
| 3 | - | - | - | Target: +5% |
| 4 | - | - | - | Target: +5% |
| 5 | ≥50% | ≥50% | - | QA + Expansion |

### Monitoring Query

```sql
-- Run daily during backfill
SELECT 
  target_institution,
  COUNT(*) as total,
  COUNT(evidence_url) as with_evidence,
  ROUND(COUNT(evidence_url) * 100.0 / COUNT(*), 1) as coverage,
  CASE 
    WHEN COUNT(evidence_url) * 100.0 / COUNT(*) >= 50 THEN '✅ READY'
    ELSE '⏳ IN PROGRESS'
  END as status
FROM credit_transfer_rules
WHERE target_institution IN ('EXCELSIOR', 'EMPIRE')
GROUP BY target_institution;
```

---

## Expansion Gate

Before triggering expansion per `docs/V1_EXPANSION_PLAYBOOK.md`:

- [ ] Coverage ≥ 50% confirmed via query
- [ ] Evidence quality spot-check passed
- [ ] No stale evidence (>180 days) in verified set
- [ ] Policy pack verified with all 6 required fields
- [ ] Expansion playbook checklist completed

---

## Roles & Responsibilities

| Role | Responsibility |
|------|---------------|
| Data Operator | Execute verification workflow, update database |
| QA Lead | Spot-check evidence quality, validate coverage |
| Engineering | Provide queries, tooling, expansion execution |
| Product | Approve expansion timeline, communicate to users |

---

## Risk Mitigation

### R1: Evidence URLs Break
- **Mitigation:** Capture `evidence_excerpt` as backup
- **Response:** Re-verify and update URL

### R2: Coverage Stalls Below 50%
- **Mitigation:** Focus on high-volume providers first
- **Response:** Re-scope to fewer courses if needed

### R3: Institution Policy Changes
- **Mitigation:** Verify policies are current catalog year
- **Response:** Update rules and re-verify

---

## Success Criteria

| Criterion | Target |
|-----------|--------|
| EXCELSIOR coverage | ≥ 50% |
| EMPIRE coverage | ≥ 50% |
| Evidence freshness | 100% < 180 days |
| Policy pack complete | 6/6 fields |
| Expansion tests pass | All green |

Upon meeting all criteria, proceed to `docs/V1_EXPANSION_PLAYBOOK.md`.

---

*This plan provides a structured path from current state to expansion-ready without compromising V1 guarantees.*
