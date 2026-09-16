# Transferability Accuracy Audit — 2026-09-15

**Verdict: RED.** The engine fabricates transfer approvals when it has no rule,
and renders them under a "Verified" badge. Underlying rules are ~8 months stale
with no scheduler in version control.

**Method.** 6 parallel auditors over distinct accuracy dimensions, each set of
findings then attacked by an adversarial verifier instructed to refute rather
than agree. 86 findings examined, 84 survived refutation, 2 refuted, 35 rated
critical/high, 33 requiring a live DB query to settle.

**Scope limit (read this first).** This audit had NO live database access.
Per the lesson recorded in `AUDIT_ADDENDUM_2026-05-21.md` — static analysis
proves a pipeline *can* run, never that it *does* — every claim that requires
production data to settle is marked as such below, with the exact SQL. Do not
treat this document as having settled those.

---

## Remediation status (updated as work lands)

| # | Item | Status |
|---|------|--------|
| 1 | No-rule path returns `unknown`; coverage keys on `hasRule` | ✅ done |
| 2 | Trust copy matches code; `last_verified_at` rendered; `→ accepted` bug fixed | ✅ done |
| 3 | Freshness gate (180d): stale rules downgrade to "review" | ✅ done |
| 4 | Seed/worker functions require admin or CRON_SECRET; evidence worker unscheduled | ✅ done |
| 5 | Policy constants reconciled with ground truth + divergence test | ✅ done |
| 6 | Unknown institutions and unaccepted providers fail closed | ✅ done |
| 7 | **Restore the scraper schedule** | ⛔ blocked — needs DB access; runbook ready at `SCRAPER_RESTART_RUNBOOK.md` |
| 8 | Fixture-merge keys / `providerType` union | ✅ done |
| 9 | Own the pricing numbers (one source) | ✅ done |
| 10 | Resolution-layer tests (templateValidator, tieredSavingsCalculator, …) | ✅ done |

### Notes on 5 and 6 (landed 2026-09-15)

**5.** `src/lib/degree/policyGroundTruth.ts` transcribes the committed
`institution_policy_ground_truth` rows with per-row provenance, and
`policyGroundTruthReconciliation.test.ts` fails the build when the TypeScript
constants disagree with them. Reconciled values:

| Institution | Field | Was | Now | Ground-truth provenance |
|---|---|---|---|---|
| WGU | alt-credit cap | 78 | **45** | seeded row + `human_override` pack |
| WGU | residency | 42 | **24** | seeded row + `human_override` pack |
| WGU | max transfer | 78 | **90** | seeded row + `human_override` pack |
| COSC | residency | 30 | **6** | `manual_verification`, catalog |
| COSC | max transfer | 90 | **114** | `manual_verification`, catalog |
| TESU | max transfer | unenforced | **117** | `manual_verification`, SmartCatalog |

Provenance is recorded rather than flattened: WGU's ground-truth row is
`verified_by='system'` ("Seeded for Phase A activation"), so its confidence was
*lowered* to 70 even though the numbers now agree — two records agreeing is not
the same as one record being checked. UMGC has no ground-truth row at all and
was dropped to confidence 50 with an explicit warning in its notes.

Also fixed: `parsePolicyData` read `max_noncollegiate_credits`, a key no pack
writes, so the alt-credit cap always fell back to the TypeScript constant even
on a "verified" pack. It now reads `max_alt_credit` (what packs actually write)
with documented fallbacks, and exposes `maxNoncollegiateVerified` /
`upperDivisionVerified`. Pack confidence is now measured from how many fields
genuinely came from the pack, instead of being a flat 95 that a CHECK
constraint guaranteed.

**6.** `validateNoncollegiateCredits` and `validateUpperDivision` returned `[]`
for an unknown institution — indistinguishable downstream from "validated, no
problems". Both now return an `UNKNOWN_INSTITUTION` error. Providers are sorted
three ways instead of two: allowlisted (counted), explicitly excluded
(`PROVIDER_NOT_ACCEPTED` error — this is the 90-Sophia-credits-at-WGU case that
previously scored zero), and known alt-credit with no record either way
(`PROVIDER_NOT_MAPPED` warning, e.g. StraighterLine, which no institution on
file either allows or refuses). `anchorPolicyAdapter` no longer defaults to
TESU; it returns `undefined`, which callers already handle. `hasPolicy()` is
the predicate to gate on.

**Still true after 5 and 6:** these numbers are internally consistent and
honestly labelled. They are not freshly verified. Every value predates the
2026-2027 catalog year, and item 7 is what changes that.

### Notes on 9 and 10 (landed 2026-09-15)

**9.** `src/lib/pricing/referenceRates.ts` is now the single source for every
price quoted in editorial content, and `referenceRates.test.ts` reconciles it
against the seeded `institution_pricing_packs` rows **by parsing the migration
SQL**, so prose and computation cannot drift apart.

| Was | Now |
|---|---|
| TESU per-credit as $519 / $419 / ~$400 / $564 in four places | $564 out-of-state, $353 in-state, both cited, effective 2024-09-01 |
| Study.com "from $95/month" beside a transfer-credit recommendation | $199/month College Plus — the $95 tier earns no college credit |
| StraighterLine 60 cr billed at $79/credit = $4,740 | 20 courses × $79 = $1,580 (the $3,160 error) |
| Excelsior "117 cr" max transfer | 108 — 117 is TESU's figure |
| TESU/COSC "90 cr" max transfer | 117 / 114 (90 is the separate alt-credit sub-cap) |
| TESU residency "16", COSC "36 minimum" | 15 / 6, from ground truth |

While fixing the `finish-bachelors-under-10k` arithmetic I found the corrected
figures described a **96-credit plan** — i.e. not a degree. COSC's residency
*minimum* is 6, but the binding constraint is the separate 90-credit alt-credit
ceiling, which leaves 30 credits that must come from a college. The guide now
models that explicitly and says so, because it is the number that actually
decides the bill.

Rates now carry an `asOf` date and `formatRateCaveat()`, which every quoted
institutional rate must render. The institution rates are ~24 months old; they
are the best-sourced figures in the repo, which is not the same as current.

**10.** Test files added for four modules that had none:
`degreeSafetyScore` (13), `tieredSavingsCalculator` (19), `templateValidator`
(15), `buildCompareRows` (17), plus `referenceRates` (21). Suite went from 387
to 472 passing.

Two real defects surfaced while writing them:

- `validateTemplate` used `template.anchorSchool || 'TESU'` — the same
  substitute-another-school's-policy defect fixed in `anchorPolicyAdapter`.
- Guarding that exposed a **pre-existing crash**: `residenceCourseCheck` is set
  to `null` when no policy resolves, and line ~252 dereferenced it
  unconditionally. Any template whose `anchorSchool` was not in the policy
  registry threw a `TypeError`; it never fired only because the TESU default
  always resolved. Both fixed, with an early return that still yields the
  policy-independent metrics.

`parseCreditsFromLabel`'s silent 3-credit default is pinned by test rather than
changed: its regex requires `(6cr)` exactly, so `(6 cr)` silently halves a
module's credits. Changing the parser could shift live template totals, so the
behaviour is documented and locked instead — a deliberate call, flagged here.

### Notes on 8, plus the domain fix (landed 2026-09-15)

**8.** Three defects, all confirmed by inspection before changing anything:

- **`providerType` union break.** The V2 fixtures carried `"institutional"`
  (38 options) and `"exam"` (5); `ProviderType` is
  `university | mooc | bootcamp | testing_center`. Every consumer tests for
  union members, so those 43 options counted as *neither* residency nor
  alt-credit — `universityCredits` came out 0 for all 11 templates, firing a
  user-visible "Need 15 more institutional credits (0/15)" warning on plans
  that were fine. Normalised to `university` / `testing_center`. V1 fixtures
  were already correct.
- **Fixture-map key mismatch.** The map was keyed on the fixture's *raw*
  `optimization` while the lookup used `normalizeOptimization(track_type)`, so
  only `TESU-fastest`, `TESU-balanced` and `WGU-balanced` could ever match —
  8 of 11 fixtures unreachable. The composite key also omitted the program, so
  the three `cs-bachelor` fixtures were silently overwritten by the three
  `business-admin-bachelor` ones. Now resolved by **exact id first** (which is
  what the seeded rows actually line up with), composite second, with a warning
  on collision instead of last-write-wins. A second call site hand-rolled
  `track_type === 'alt_max' ? 'alt-credit' : 'standard'` and compared it to raw
  fixture optimizations — it could never match, and computed an unused key
  variable. Both sites now share one resolver.
- **`acceptedCeiling` always 0.** It read `twoPhaseData?.altCredits ?? 0`, and
  no fixture or seeded row carries `twoPhaseData` — so /compare rendered
  "max via alt providers: 0 / 120 cr" for every school and the
  credit-friendliness badge never appeared (`tagWinner` bails at <= 0). It now
  falls back to the institution's alt-credit cap, which is the correct source
  for a policy fact; schools with no policy stay at 0 rather than borrowing
  another school's number.

`fixtureIntegrity.test.ts` (12 tests) pins all of it, including a test that
every template yields *some* university credit — the direct symptom of the
union break.

**Domain configurability (was an open blocker, not a numbered item).**
`https://pivot.app` was hardcoded in eight source files plus `index.html`,
`robots.txt` and `sitemap.xml`. If that is not the live domain, every canonical
tag declares the real pages duplicates of somewhere else, which on its own
prevents ranking — and no amount of accuracy work matters on a site that is
not indexed.

Now driven by `VITE_SITE_URL` through `src/lib/siteUrl.ts`, with
`vite.config.ts` defaulting it so `index.html`'s `%VITE_SITE_URL%` placeholders
never ship as literal text, and `scripts/build-sitemap.mjs` rewriting both
`sitemap.xml` and `robots.txt` from the same value. Verified end to end with a
non-default origin: index.html, sitemap, robots and the JS bundle all picked it
up. **The default is unchanged, so this is a no-op until the owner sets the
variable** — which is now the entire fix for a wrong domain.

---

## Synthesis

# Will Pivot give accurate transferability analysis?

**No — not today, and not for the three institutions it currently advertises.** The engine will confidently tell a user a course transfers when the database contains no rule for it at all, and it will render that fabrication under a green "Verified" checkmark. That is a logic defect, not a data gap, and it fires on the live marketplace regardless of how fresh your rules are. Separately, the rules it *does* have are 8.2 months stale with no scheduler in version control to refresh them. You need both fixed before you buy traffic.

## Class A — the engine's logic is wrong

These produce wrong answers even with perfect, same-day data.

1. **Missing data is converted into a positive transfer claim.** `useTransferVerification.ts:205-220` has no "unknown" return path: with no matching rule, TESU/COSC/EXCELSIOR source codes resolve to `verified`, Sophia/Study.com/StraighterLine/CLEP to `elective` ("Transfers as free elective credit"). `transferCoverage.ts:91` counts anything not literally `unknown` as covered, so **coverage is mathematically pinned at 100%** and the panel prints "N of N transferable courses have verified rules." The correct behavior exists elsewhere — `transferEngine.ts:48` implements strict mode ("no rule found → NOT accepted") — the marketplace simply doesn't use it.
2. **The policy constants contradict your own ground truth.** `institutionPolicies.ts:293,303` sets COSC at 90 transfer / 30 residency; your seeded ground truth (`20260109044935:53-54`) says **114 / 6**. WGU is 78/42 in code vs 90/24 with an ACE cap of 45 in `20260111183654:31`. Worse, `verifiedPolicyService.ts:136` reads a key (`max_noncollegiate_credits`) that **no pack anywhere writes**, so the TypeScript constant wins even on a "verified" pack: WGU's alt-credit cap renders as 78 behind a green badge when your own record says 45. That is a 33-credit overstatement on the single number that decides how much Sophia a user buys.
3. **Ineligible providers are ignored, not rejected.** `institutionPolicies.ts:513-518` sums only providers *on* the allowlist, so 90 Sophia/Study.com credits at WGU — a school your code comments say "does NOT accept Sophia or Study.com" — score **zero** against the cap. StraighterLine is on no institution's list at all, so it is silently zeroed everywhere despite being an advertised provider.
4. **Unknown schools become TESU.** `anchorPolicyAdapter.ts:32-43` maps only TESU/WGU/COSC and falls back `|| 'TESU'`. UMGC, SNHU, Phoenix, Strayer and every scrape-template code are selectable in the anchor picker and get validated against TESU's 15-credit residency.
5. **"Verified / 95% confidence" is a constant, not a test.** `verifiedPolicyService.ts:125-131` sets confidence 95 when two fields are non-null — but a CHECK constraint (`20260109170551:5-15`) already guarantees they are non-null on every non-deprecated row. Every active pack is 95%. The "Verified: <date>" beside it is the row's `created_at`.
6. **The public /transfer-check page overstates by construction.** It filters on `is_active` only, badges results "N verified rules", says "We only show rules we've verified against source documents," and prints `→ accepted` whenever `target_course_code` is null. From committed migrations alone, **196 rows render that way**, including a seeded rule that explicitly says Sophia SOPH-COMM-101 is *rejected* at WGU.
7. **Upper-division credit rests on a bare integer.** `level: 300` on a Sophia course is a hand-typed number with no evidence URL, source, or institutional confirmation, and it satisfies COSC's and TESU's upper-division minimums (45 of COSC's 48 UD credits in the shipped plan). A registrar reading this would stop here.
8. **One AI-promoted rule deactivates every legacy rule for that provider→school pair**, with no course-code predicate (`validate-transfer-candidates/index.ts:394-408`).
9. **`evidence-backfill-worker` fabricates evidence.** It maps institutions to landing-page URLs from a hardcoded table and writes them as `evidence_url` with zero `fetch()` calls. Its own comment: "we haven't verified specific course." It is one of only three crons still running, every 15 minutes.

## Class B — logic fine, data stale or absent

- **Transfer rules: 8.2 months stale.** Last recorded scrapes are TESU 2026-01-13 (8.1 mo), COSC/WGU 2026-01-09 (8.2 mo). The V2 cohort is 4.8-5.0 months. **EXCELSIOR was never scraped.**
- **No scheduler exists in version control** for `transfer-scraper-auto-scan`, `policy-change-scan` or `ops-cron-runner`. All 12 `cron.schedule()` calls resolve to six unrelated jobs; no GitHub Actions `schedule:`; no Vercel/Netlify cron. The only in-repo trigger is an admin button.
- **The 2026-08-03 stamping fix (3686cb0) is mechanically correct but cannot repair data**, and by design its first successful run detects zero changes — `transfer-scraper-crawl:305` sets `content_changed = !!old_hash && ...`, false when `last_hash` is NULL.
- **Nothing ages out a rule.** Two freshness views, four expiry columns and the `last_verified_at_inferred` flag have zero consumers outside generated types.
- **Policy provenance was backfilled 2026-01-22** with `verified_by='system-migration'` and a non-existent URL — now 7.8 months old. A 180-day gate exists (`useAvailableInstitutions.ts:129-166`) and should already be blocking these, but `verifiedPolicyService` has no staleness check and still feeds PolicyCard.
- **Catalog years are 1-2 cycles behind** (2024-2025 / 2025-2026 vs 2026-2027). TESU's only verification stamp in code is 2025-01-07 — **20.2 months**.
- **Pricing is internally contradictory and unowned.** TESU per-credit ships as $519, $419 and ~$400 while the seed says $564 (effective 2024-09-01, 24.5 months old) — and the seed is what the planner actually computes with. Two guides describe COSC's billing model incompatibly. `finish-bachelors-under-10k` applies StraighterLine's $79-per-*course* per *credit*, a $3,160 line-item error. All five guides are static prose with no data reads, last touched 2026-04-17 (5.0 months), presented as "Built on verified transfer rules."
- **DSST has zero transfer rules** in any migration but is promoted on four surfaces, two public. ASUO, GCU and UMGC have no ground-truth rows at all yet were seeded into V1 scope at `evidence_coverage_pct = 0`.

## What is genuinely solid — build on this

- `transferEngine.ts` strict mode is the correct semantics, already written. You need to route the marketplace through it, not invent it.
- The activation trigger (`20260421200252`) is real work: seven gates, a mandatory ground-truth row, refusal of auto-defaulted `max_transfer_credits`, confidence floors. It successfully blocked the bad EXCELSIOR/EMPIRE drafts.
- The `policy_packs_require_caps` CHECK constraint fires on INSERT and is a real backstop.
- Trimming `VERIFIED_SCHOOL_CODES` from 5 to 3 was the right conservative call and does confine the public funnel.
- `PolicyCard` fails closed — it zeroes every meter when a pack isn't verified.
- `TemplateValidationBanner` really does render "Template may not lead to graduation" for TESU/WGU/COSC anchors.
- `yearPlanner.test.ts` and `totalsCalculator.test.ts` cover cap validation and cost/time totals.
- Several alarming-looking defects turned out to be **dead code** and are not problems: the per-year cap cascade, the "Cheapest" card selection, the year-node policy badges, and one of the two "Guaranteed acceptance" strings. Verify before you spend time on them.

## What I could not determine without the database

The 2026-05-21 addendum's lesson was that static analysis proves a pipeline *can* run, never that it *does*. Six questions are genuinely unsettled. Run these before deciding anything:

1. `SELECT jobid, jobname, schedule, active, command FROM cron.job ORDER BY jobname;` — is a Dashboard-created scraper cron alive outside version control? Scrapes demonstrably happened in Jan and Apr, so something triggered them.
2. `SELECT target_institution, data_quality, acceptance_status, count(*), max(last_verified_at) FROM credit_transfer_rules WHERE is_active AND target_institution IN ('TESU','COSC','WGU') GROUP BY 1,2,3;` — how many rows displayed as "verified" are sub-verified tier, and how old is the newest.
3. `SELECT institution, academic_year, status, policy_data->>'residency_credits', field_provenance->'residency_credits'->>'source', policy_data->>'provenance_verified_at' FROM institution_policy_packs WHERE status='active';` — which catalog year is live, and how many caps are 25%-guesses.
4. `SELECT institution_code, track_type, status, estimated_cost, (template_data ? 'yearTemplates'), (template_data ? 'terms') FROM degree_templates WHERE status='active';` — does the fixture-collision path or the NULL-cost fallback fire in production.
5. `SELECT institution_code, count(*) FILTER (WHERE last_scraped_at IS NOT NULL), max(last_scraped_at) FROM scrape_url_templates GROUP BY 1;` — has anything scraped since the 2026-08-03 fix.
6. `SELECT evidence_url, count(*) FROM credit_transfer_rules WHERE evidence_url IN (<the five hardcoded landing pages>) GROUP BY 1;` — how much of your evidence is manufactured.

If (1) returns nothing, your rules are 8.2 months old with no mechanism to age. If (6) is a large fraction, the "Verified" count and guaranteed-savings dollars are inflated by an amount you can compute.

## Should you send paying traffic? No.

Not to `/transfer-check`, `/compare`, `/guides` or the marketplace as they stand. The exposure is specific: these are **public, unauthenticated, indexed, affiliate-monetized** pages that make affirmative verification claims — "verified rules," "we only show rules we've verified against source documents," "Costs & timelines pulled from verified institutional catalogs," and an affiliate disclosure asserting "our recommendations come from verified transfer data" — while the code behind them applies no verification predicate and, in the no-rule case, manufactures the answer. That is a deceptive-representation pattern under FTC Act §5 and state UDAP statutes, and the affiliate revenue makes it a commercial claim rather than editorial opinion. A user who buys 30 Sophia credits for WGU on the strength of a green checkmark has a documented, screenshot-able reliance claim, and the repo itself contains the contradicting record. I'm not your lawyer — but get one before launch, not after the first complaint.

## Fix list, cheapest first

1. **Delete the heuristic fallback (1-2 hours, largest single risk reduction).** Make `getHeuristicStatus` return `unknown`, and make `computeTransferCoverage` count only rows with a real rule. Accept that coverage drops from 100% to whatever it truly is. That number is your actual product readiness metric.
2. **Change the trust copy to match the code (2-4 hours).** Remove "verified rule," "we only show rules we've verified," and "Guaranteed acceptance" (`DecisionDockRouter.tsx:1120`). Replace `→ accepted` with the literal `acceptance_status`. Render `last_verified_at` — it is already being fetched at `TransferCheckPage.tsx:63` and thrown away. Add an accuracy disclaimer beside the numbers, not below the CTA.
3. **Add an age filter to the four transfer-rule read paths (half a day).** One predicate: `last_verified_at > now() - interval '180 days'`. The views (`transfer_rule_freshness`) are already written; wire them in. Note the current TTLs (365d for `institution_pdf`) are longer than a catalog year and won't catch an annual rollover — shorten them.
4. **Stop the evidence-backfill worker (15 minutes) and null out the manufactured URLs (1 hour).** It is actively degrading your data every 15 minutes.
5. **Reconcile `institutionPolicies.ts` against `institution_policy_ground_truth`, and add a test that fails on divergence (1 day).** Fix COSC (114/6), WGU (90/24/45). Add the missing `max_noncollegiate_credits` key to the packs or read the canonical `max_alt_credit`.
6. **Make unknown providers and unknown institutions fail closed (1 day).** Have `validateNoncollegiateCredits` reject providers not on the allowlist. Delete the `|| 'TESU'` in `anchorPolicyAdapter.ts:43` and throw. Gate the anchor picker to institutions with a live policy.
7. **Restore and verify the scraper schedule (1-2 days, requires DB access).** Put the cron in a migration so it is auditable. Expect the first run to report zero changes; that is by design, not success. Add an independent liveness alert that does not depend on the pipeline it monitors.
8. **Fix the fixture-merge keys and the `providerType` union (1-2 days).** `'institutional'`/`'exam'` are not in `ProviderType`, so residency computes 0 and users get a false "Need 15 more residency credits (0/15)" toast. 8 of 11 fixtures are unreachable; two TESU keys collide.
9. **Own the pricing numbers (2-3 days).** One source. Today's TESU rate is nowhere in the repo — the seed is 24.5 months old. Fix the $3,160 StraighterLine arithmetic error and the Excelsior 117 (that is TESU's cap).
10. **Add the resolution-layer tests that don't exist (3-5 days).** `templateValidator`, `transferEngine`, `tieredSavingsCalculator`, `transferCoverage`, `degreeSafetyScore`, `buildCompareRows` have no test file. The tests you *do* have assert "WGU does NOT accept Sophia" against a function production never calls.

Items 1-4 are roughly two days of work and take you from "actively asserting false things" to "honest about what you don't know." That is the minimum before traffic. Items 5-7 are what make the product true rather than merely honest.

---

## Completeness critique (what the six auditors missed)

Six auditors read the read paths exhaustively. Here is what falls outside all six.

## Gaps nobody covered

**1. Write-path authorization — nobody asked who is allowed to invoke the writers**
- `supabase/config.toml:19-32, 57-79, 85-97` sets `verify_jwt = false` on `transfer-scraper-crawl / -extract / -validate / -merge / -auto-scan`, `policy-change-scan`, `evidence-backfill-worker`, `template-generation-worker`, `run-seeds`, `seed-data-2025`, `seed-v5-marketplace`, and `optimizer-seed-{tesu,cosc,excelsior,wgu}`. I grepped every one of those functions for an in-code guard (`getUser`, `CRON_SECRET`, `WORKER_SECRET`, admin role, 401): **zero hits**. `optimizer-seed-tesu/index.ts:34-38` builds a `SERVICE_ROLE_KEY` client, sets `Access-Control-Allow-Origin: *`, and writes `institutions`, `institution_credit_limits`, `alt_credits`, `cross_institution_equivalencies` and `degree_templates` (`:49, :89, :200, :289, :368`). Any anonymous POST rewrites the templates that produce cost and time-to-degree. The team knows the pattern — `config.toml` around `purge-seeded-invariant-data` carries "Hardened 2026-08-03: data purge must not be publicly invokable / verify_jwt = true" — and applied it to exactly one function.
- Why it matters: every finding about *stale* or *wrong* data assumes the data got there through the pipeline. This is an unauthenticated path to arbitrary policy and template values.

**2. A doc self-report that was accepted without checking the code — `docs/V1_COMPLIANCE_AUDIT.md:9-14, 49-65`**
- The doc asserts "9 write-capable edge functions protected", "Server-side enforcement on all mutation paths", "No bypass routes", and a matrix marking `transfer-scraper-merge`, `transfer-scraper-validate`, `evidence-backfill-worker` etc. "✅ Protected". Nobody checked `config.toml` against that matrix. Three of those ten are `verify_jwt = false`; the doc's own QA snippet (`:105-110`) invokes `evidence-backfill-worker` with only `$SUPABASE_ANON_KEY`, documenting unauthenticated invocation as the calling convention.
- The named guard is `checkV1InstitutionScope` (`supabase/functions/_shared/policyGate.ts:52-64`), an *institution-scope* filter, not access control — and its own docblock at `:48-51` reads "SYNC (DEPRECATED)… prefer `checkV1InstitutionScopeAsync` for hard gates". Eight of the ten "protected" endpoints call the deprecated sync version (`transfer-scraper-merge:1728`, `template-job-processor:94`, `bulk-import-transfer-rules:58`, `rerun-template-invariants:272`, `transfer-scraper-validate:406`, `bulk-rerun-templates:152`, `run-degree-truth-scan:51`). That version reads only `V1_ALLOWED_INSTITUTIONS`, the hardcoded 10-item array in `supabase/functions/_shared/v1Scope.ts:18-25` — it never queries `institution_v1_scope`. Removing a school from the scope table would not block a single one of those eight endpoints.

**3. The per-course transfer validator exists, is 291 lines, and is unreachable — `src/pages/EduTree/v5/utils/templateTransferValidator.ts`**
- Its docblock (`:1-7, :52-57`) says "Every course must be provably transferable… This is the CRITICAL function for ensuring decentralized degrees work." It is imported by `templateValidator.ts:18` and called from exactly one place: `validateTemplateWithTransfers` (`templateValidator.ts:338-352`), which emits the `UNVERIFIED_TRANSFERS` error. `grep -rn validateTemplateWithTransfers src/ scripts/` returns **only the definition**. The shipped banner calls the sync `validateTemplate` (`TemplateValidationBanner.tsx:21`), as do `integrityScanner.ts:442` and `templateAudit.ts:35`.
- Why it matters: the coverage auditor concluded "no per-course transfer check on the bulk path" and blamed a missing `TransferVerificationBadge`. The real state is worse and more fixable — the check is written, wired into the validator module, and orphaned one call level up. `UNVERIFIED_TRANSFERS` can never fire.

**4. The promotion path is deadlocked, which is a separate cause of staleness from the dead cron**
- `supabase/migrations/20260109041334_337b452c-05b5-4783-aca6-96a4b43f72a0.sql:119-121` creates `UNIQUE INDEX idx_one_active_pack_per_institution ON institution_policy_packs (institution) WHERE status = 'active'` (never dropped; a second, weaker one at `20260109142313:7-9`).
- `supabase/functions/promote-policy-pack/index.ts:287-297` sets the new pack to `status:'active'` and **never demotes the incumbent** — I grepped the whole file for `superseded`/`deprecated`/`demote`: no write. `transfer-scraper-validate/index.ts:228-230` records "REMOVED: Auto-supersede logic - promotion is now admin-only" and supplies no replacement.
- Consequence: for any institution that already has an active pack, promotion raises 23505 and returns 500 at `:299-305`. Even a fully restored scraper producing a perfect 2026-2027 pack could not replace the incumbent. This is the mechanism behind the frozen policy data, not another symptom of it.

**5. Every trust gate has a self-service waiver — `supabase/migrations/20260421200252_...sql:141-176`**
- Gate 6 is bypassed by `policy_data->>'confidence_waived' = true` plus any non-empty `confidence_waiver_reason`; Gate 7 by `provenance_waived` plus any non-empty `provenance_waiver_reason`. Both flags live **inside `policy_data`** — the same JSON blob `transfer-scraper-merge/index.ts:2631-2648` writes. The auditor who read this trigger listed "GATE 6 enforces a 0.70 confidence floor and GATE 7 requires provenance_verified_at/by/source_url" and did not mention the `ELSE` branches. No committed TS writer sets the flags today (repo-wide grep: migrations only), so this is latent like the INSERT bypass — but it means the confidence floor and provenance requirement are opt-out, not invariants.

**6. Gate 5 is a regression, not a design — compare `20260109045302_...sql:129-165` with the live `20260421200252_...sql:132-139`**
- The January trigger looked up ground truth `WHERE UPPER(institution)=UPPER(NEW.institution) AND academic_year = NEW.academic_year`, then did a **value-equality check**: `IF pack_residency != gt_residency THEN RAISE EXCEPTION 'residency mismatch. Pack has %, ground truth has %'` (`:161-165`), and required residency/max_transfer provenance to be `ground_truth` or `human_override` only (`:120-127`).
- The live trigger reduces all of that to `SELECT EXISTS (SELECT 1 FROM institution_policy_ground_truth WHERE institution = NEW.institution)`. No year match, no value comparison, and `auto_defaulted` is now an accepted provenance source. The policy auditor noted the live gate is existence-only; nobody traced that it used to enforce equality against the repo's own ground truth and was weakened. That deletion is the single change most directly responsible for TS constants and 25%-guessed residencies being able to reach `status='active'`.

**7. There are four resolution paths, not two — and one verified finding rests on a wrong premise**
- The resolution auditor's finding 17 says `transferEngine.checkTransferRule` "uses a raw uppercased provider and a raw lowercased course code". The *values* are right but the *columns* are not: `src/pages/EduTree/v5/engine/transferEngine.ts:127-136` queries `source_institution_norm` / `source_course_code_norm` / `target_institution_norm` — the same generated columns as `useTransferVerification.ts:84-95`. Those are `GENERATED ALWAYS AS (UPPER(...)) STORED` / `LOWER(...)` (`supabase/migrations/20260113142427_...sql:5-18`), so normalization is consistent at the DB layer; the divergence is entirely client-side.
- The missed third and fourth paths: `src/pages/EduTree/v5/utils/useTransferRule.ts:23-38` → `src/shared/lib/api/transferRules.ts:12-30`, which applies `normalizeProviderCode` but **not** `normalizeCourseCode`; and `findTransferableAlternatives.ts:1-10` → `fetchAcceptedTransferSources` (`transferRules.ts:32-43`), the only reader anywhere that filters `acceptance_status = 'accepted'`. So three distinct (provider-normalization × course-normalization × `is_active`) combinations ship for the same tuple, and the one that correctly filters `accepted` is used only for the "find alternatives" sidebar.

**8. A second rule table and a dead server-side plan evaluator — `supabase/functions/evaluate-plan/index.ts`**
- It reads `.from('transfer_rules')` (`:62`) — a different table from `credit_transfer_rules` — filtering `.eq('program_id', ...)` and reading `residency_credits_min`, `transfer_credits_max`, `upper_division_residency_min` (`:92-110`). None of those columns exist: the real schema is `(to_program_id, rule_kind, value, details, description, active, block_id, course_id, transfer_state, score, notes)` (`supabase/migrations/20250929163823_...sql:97-107`, confirmed against `src/integrations/supabase/types.ts:14140-14155`). The query 42703s and the function returns 400.
- It also contains a logic defect that would matter if the schema were fixed: `transfer_used = Math.min(credits_total, transfer_cap)` then `if (transfer_used > transfer_cap)` (`:93-101`) — unreachable after the clamp — and `residency_progress = credits_total - transfer_used`, which is 0 for any plan under the cap, so "residency not met" fires unconditionally. Defaults are the same fabricated 30/90 (`:92-93`). No caller anywhere (`grep -rn evaluate-plan src/ supabase/ cypress/ tests/`: zero). Worth knowing a second plan-evaluation implementation exists before anyone "fixes" it into service.

**9. No test in this repository gates anything — `package.json`, `.github/workflows/`**
- `package.json` scripts are `dev, build, build:dev, lint, preview`. There is **no `test` script**; I ran `npm test` and got `npm error Missing script: "test"`. `.github/workflows/test.yml:38` runs `pnpm test run --coverage` and `:95` runs `pnpm cypress run`; `.github/workflows/edutree-validate.yml:28` runs `npm test -- src/pages/EduTree`. All fail. `cypress` is not in `devDependencies`, and there is no `pnpm-lock.yaml` (the cache key at `test.yml:24` hashes a file that doesn't exist).
- `vitest.config.ts:11` sets `include: ['src/**/*.{test,spec}.{js,ts,tsx}']`, so `tests/policyGate.test.ts` — the file `V1_COMPLIANCE_AUDIT.md:40` names as the scope sync check — is outside the runner's glob as well as being a Deno test. `edutree-validate.yml:33-38` guards its data-model validator with `if [ -f scripts/validate-edutree.cjs ]`; that file does not exist, so the step passes vacuously.
- Why it matters: several findings are phrased as "no test covers X". The stronger statement is that the 30 test files that *do* exist — including `yearPlanner.test.ts` and `institutionPolicies.test.ts` — have never run in CI, so nothing would have caught any of this at merge time.

**10. `is_active` was retroactively set true for the entire historical corpus — `supabase/migrations/20260416154114_...sql:3-4`**
- `ALTER TABLE credit_transfer_rules ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`. On PG 11+ a non-volatile `DEFAULT` on `ADD COLUMN` backfills every existing row, so every rule inserted before 2026-04-16 — including the `rejected` seeds and the whole `legacy_unverified` population — became `is_active = true` in one statement.
- `is_active` is the *only* quality predicate on the public checker (`src/pages/public/TransferCheckPage.tsx:64`) and the sole filter in the `active_transfer_rules` view (`:17-27` of the same migration). Multiple findings treat that filter as carrying signal; for the pre-April corpus it carries none by construction.

**11. Minor, but fails in the wrong direction — `src/lib/degree/v1Scope.ts:20, 36-46`**
- On any fetch error the frontend scope check returns `FALLBACK_V1_INSTITUTIONS = ['TESU','COSC','WGU','EXCELSIOR','EMPIRE']`. A DB blip makes the gate *more* permissive, re-admitting the two institutions `src/lib/planScoring/config.ts:27-36` deliberately cut on 2026-08-03. The policy auditor noted the list is stale; the fail-open direction is the part that matters.

## Where coverage was adequate

- **Caching/concurrency**: I checked `src/app/providers.tsx:11` (default `QueryClient`) and every `staleTime`/`gcTime` in `src/` — all minutes-scale, nothing that would serve months-stale data beyond what the underlying rows already are. Not a gap.
- **RLS / anonymous draft reads**: `supabase/migrations/20260111055746_...sql:2-5` grants `SELECT USING (true)` on `institution_policy_packs` to anon, so drafts are enumerable with the anon key — but every application read path filters `status='active'` (`verifiedPolicyService.ts:107-112`, `useInstitutionPolicyPack.ts:69-76`, `useAvailableInstitutions.ts:83-88`). No draft pack reaches a user surface. Disclosure issue, not an accuracy one.
- **Normalization at the DB layer**: the `_norm` columns are `GENERATED ALWAYS … STORED`, so they cannot drift from their source columns. The divergences are all client-side, as covered in item 7.
- **The 78.8% coverage figure**: this one *was* chased properly — the provenance auditor located `check_institution_onboarding_readiness` (`20260122151037_...sql:159-169`) and `run-degree-truth-scan/index.ts:677` and correctly characterized both as non-empty-string tests. No gap there. The doc self-report that went unverified is the enforcement matrix in item 2.

---

## All critical & high findings (post-refutation)

### 1. [HIGH] No scheduler for the transfer-scraper / policy-change-scan / ops-cron-runner path exists ANYWHERE IN VERSION CONTROL: all 12 `cron.schedule()` calls under supabase/migrations/ resolve to six job names

- **Verdict:** PARTIAL
- **Affects user-facing accuracy:** True
- **Needs live data:** True
- **Settling query:** `SELECT jobid, jobname, schedule, active, command FROM cron.job ORDER BY jobname;`
- **Evidence:** All cron.schedule sites: supabase/migrations/20250825192014_*.sql:2 ('maya-insight-generator'), 20250825193152_*.sql:5 ('maya-insight-generator-secure'), 20250825195459/195935/210523/212945/231539/233633 + 20260826155222 ('maya-hourly-insight-generation'), 20260113160411_*.sql:81 ('evidence-backfill-worker-15m') and :88 ('degree-truth-scan-nightly'), 20260114000337_*.sql:31 ('template-generation-cron'). supabase/migrations/20260803210000_phase2_legacy_teardown.sql:10-23 unschedules only the three Maya names; :27-28 drops the signup trigger — nothing the transfer pipeline used. `grep -rn 'transfer-scraper|auto-scan|batch-scan' supabase/migrations/` returns zero. docs/EDGE_FUNCTION_AUDIT.md:4-5 and :85-86 ('Crons that KEEP running: evidence-backfill-worker-15m, degree-truth-scan-nightly, template-generation-cron'). policy-change-scan's only caller: supabase/functions/ops-cron-runner/index.ts:262. supabase/migrations/20260122184440_*.sql:37 'ops-cron-runner has never executed - schedule it in Supabase Dashboard'. .github/workflows/{test,edutree-validate}.yml carry only push/pull_request triggers. vercel.json has builds/routes/headers only; netlify.toml has build/redirects/headers only
- **Verifier reasoning:** I enumerated every cron.schedule in all 822 migrations myself and read each job name; they match the claim exactly. I read the teardown migration in full and confirmed it touches only Maya jobs plus handle_new_user_profile. I read both workflow files end to end (push/PR only) and both host configs. I grepped src/, supabase/, scripts/, tests/, cypress/ for every pipeline function name. The one correction: auto-scan has a second in-repo caller (batch-scan:206), which does not change the conclusion because batch-scan has zero callers and no config.toml entry (so verify_jwt defaults true). The reason this cannot be CONFIRMED is structural, not evidential: BASELINE Q1 records real scrape jobs on 2026-01-09..13 and 2026-04-17..21, which something must have triggered; a Dashboard-created cron is invisible to the repo. Only `cron.job` settles it.

### 2. [HIGH] For credit_transfer_rules specifically, the claim holds: every read path filters on is_active (and sometimes confidence/data_quality) and never on age, and the freshness views, expiry columns and infe

- **Verdict:** CONFIRMED
- **Affects user-facing accuracy:** True
- **Needs live data:** False
- **Evidence:** Views: supabase/migrations/20260120205907_*.sql:14-70 (transfer_rule_freshness) and :61-70 + 20260120210409_*.sql:16-28 (transfer_rules_with_freshness). Grep for transfer_rules_with_freshness|transfer_rule_freshness|freshness_status|days_since_verified|ttl_days across src/ and supabase/functions/ returns hits ONLY in src/integrations/supabase/types.ts (lines 4507, 13926, 16163, 16918-16962, 17085-17196). Expiry columns added at supabase/migrations/20260112181814_*.sql:100-107 (catalog_year_start, catalog_year_end, verified_at, expires_at, decay_after_months DEFAULT 24) with the temporal index at :119-121; the only `expires_at` hits in src/ are the unrelated `tier_expires_at` quota column (src/hooks/useQuotaCheck.ts:26). `catalog_year_start|catalog_year_end` appear in NO file outside that one migration. last_verified_at_inferred: only types.ts. Read paths verified: src/shared/lib/api/transferRules.ts:18-25 and :36-40 (is_active only), src/pages/EduTree/v5/engine/transferEngine.ts:131-139 (is_active only), src/pages/EduTree/marketplace/hooks/useTransferVerification.ts:85-95 (no is_active, no age), src/pages/public/TransferCheckPage.tsx:62-67 (is_active only). Downgrade RPC supabase/m
- **Verifier reasoning:** I attacked this hardest, because it is the finding that would survive a cron fix. I grepped for every date-comparison idiom in src/ and supabase/functions/ (stale, freshness, daysSince, isStale, last_verified_at, NOW() - INTERVAL) rather than trusting the auditor's grep terms. That surfaced three age gates the auditor missed — but all three key on institution_policy_packs / degree template provenance, not on a credit_transfer_rules row, so the claim as scoped survives. I then read each of the five transfer-rule read paths in full: none carries an age predicate, and the only ordering keys are confidence and quality_rank. I also checked the institution_policy_packs.stale boolean (20260112215443_*.sql:48) — it is set only event-driven by transfer-scraper-merge/index.ts:2678 when a new pack is blocked, never by age, and has no src/ reader.

### 3. [HIGH] Confirmed as stated. Two citation corrections: the empty-state copy is at src/pages/public/TransferCheckPage.tsx:155-160 (not :185-187), and the is_active DEFAULT true is at supabase/migrations/202604

- **Verdict:** CONFIRMED
- **Affects user-facing accuracy:** True
- **Needs live data:** False
- **Settling query:** `SELECT target_institution, data_quality, status, count(*), min(last_verified_at), max(last_verified_at) FROM credit_transfer_rules WHERE is_active = true AND target_institution IN ('TESU','COSC','WGU') GROUP BY 1,2,3 ORDER BY 1,2;`
- **Evidence:** src/pages/public/TransferCheckPage.tsx:61-67 — `.from('credit_transfer_rules').select('id, ..., evidence_url, last_verified_at').eq('is_active', true).ilike('source_institution', ...).in('target_institution', [...VERIFIED_SCHOOL_CODES]).limit(120)`; the only optional extra predicate is the source_course_code ilike at :70. Badge at :177: `{schoolRows.length} verified rule{...}`. Empty state at :155-160: 'We only show rules we've verified against source documents'. Row render at :180-202 shows source_course_code, target_course_code, acceptance_status and an evidence link — no date anywhere. `last_verified_at` declared at :37, selected at :63, never referenced again. Route: src/app/routes.tsx:273. RLS confirms no backstop: supabase/migrations/20251022185011_*.sql:34-37 (`credit_transfer_rules_public_read ... TO public USING (true)`) and 20250903230025_*.sql:206-207. Quality ladder incl. 'unverified'/'legacy_unverified': supabase/migrations/20260416154114_*.sql:19-25. That lower-tier rows really exist is corroborated by supabase/migrations/20260416163740_*.sql, which deactivates STUDYCOM->COSC rows `WHERE data_quality = 'unverified' AND is_active = true` — a targeted sweep, not a globa
- **Verifier reasoning:** I read the file top to bottom looking for a downstream guard: there is none. I checked whether RLS or a view could narrow the result set — the table is read directly (not through active_transfer_rules), and both public-read policies are USING (true). I checked the route is not behind ProtectedRoute: it sits in the explicitly-labelled public block. The claim asserts only code behaviour, all of which I confirmed by reading, so it does not need live data; the live query is still useful for MAGNITUDE (how many displayed rows are sub-'verified' tier and how old the newest is), which is why I kept the query.

### 4. [HIGH] The fail-open is real and broader than claimed: `validateNoncollegiateCredits` (src/lib/degree/institutionPolicies.ts:498-546) accumulates a provider's credits only when `noncollegiatePool.includedPro

- **Verdict:** PARTIAL
- **Affects user-facing accuracy:** True
- **Needs live data:** False
- **Evidence:** src/lib/degree/institutionPolicies.ts:513-518 (`if (noncollegiatePool.includedProviders.includes(provider.toUpperCase())) totalNoncollegiate += credits;`); WGU includedProviders at :206 + comment at :207; TESU :126-133 and COSC :296-299 both omit STRAIGHTERLINE; sole production caller src/pages/EduTree/v5/utils/templateValidator.ts:277; fixture key mismatch at src/hooks/useMarketplaceTemplates.ts:424 vs :529
- **Verifier reasoning:** I read the full function body and confirmed the loop is an inclusion filter, not a rejection check, and that the `totalNoncollegiate > cap` test at :521 therefore cannot fire on disallowed providers. I grepped every includedProviders list and found STRAIGHTERLINE in none of the five — an instance the original finding missed. I then attacked the example: I replayed validateTemplate's exact algorithm over all 15 shipped fixtures in node and got universityCredits=0 / byProvider {SOPHIA:60, STUDYCOM:30, WGU:30} for it-bachelor-wgu-multischool-2025, which trips RESIDENCY_SHORTFALL (0 < 42), so the plan does not 'validate clean'. I also traced the fixture-merge key construction (useMarketplaceTemplates.ts:422-424 builds keys from the raw fixture `optimization` field; :529 looks up with `normalizeOptimization(track_type)`, whose possible outputs are standard|alt-credit|balanced|fastest|multi-sc

### 5. [HIGH] The type/data contract break is real and I confirmed the arithmetic: src/pages/EduTree/v5/types/v5.ts:10 defines ProviderType as 'university'|'mooc'|'bootcamp'|'testing_center'|null|undefined, while m

- **Verdict:** PARTIAL
- **Affects user-facing accuracy:** True
- **Needs live data:** True
- **Settling query:** `SELECT institution_code, track_type, (template_data ? 'yearTemplates') AS has_year_templates, (template_data ? 'terms') AS has_terms, count(*) FROM degree_templates WHERE status='active' GROUP BY 1,2,3,4 ORDER BY 1,2;`
- **Evidence:** src/pages/EduTree/v5/types/v5.ts:10; `grep -o '"providerType": *"[a-z_]*"' src/fixtures/templates/marketplace-v2-templates.json | sort | uniq -c` → 5 exam, 38 institutional, 259 mooc; src/pages/EduTree/v5/utils/templateValidator.ts:189-195, :210-216; src/pages/EduTree/v5/state/usePlanBasket.ts:490 (`providerType: selectedOption.providerType`), :534-556 (hardcoded TESU/WGU/UMGC table + user toast at :565-570); src/lib/degree/autoHeal.ts is 100 lines total, :63-74 gated on maxTransferCredits, callers EduTreeV5Page.tsx:303 / EduTreeV6Page.tsx:224 pass 2 args
- **Verifier reasoning:** I read v5.ts:10 and counted the fixture providerType values directly. I replayed validateTemplate in node over all 15 fixtures and confirmed universityCredits=0 for all 11 V2 templates and 15 for all 4 V1 templates (V1 uses 'university'). I then went looking for what would make the finding wrong: I checked every reference to 'institutional' in src/ and found no normalization step mapping it to 'university'. I read autoHeal.ts in full — it is 100 lines, the cited lines do not say what is claimed, and the transfer-cap branch is unreachable because neither caller supplies the third argument. I traced the alternative DB path (transformToMarketplaceTemplate → termsToYearTemplates → slotOptionToMarketplaceOption at useMarketplaceTemplates.ts:44-88) which emits 'testing_center'/'university', so the defect is confined to fixture-merged templates.

### 6. [CRITICAL] Confirmed, and settleable from code alone. `getHeuristicStatus` (useTransferVerification.ts:205-220) never returns 'unknown' and never looks at the target school; it is invoked on the no-rule path at 

- **Verdict:** CONFIRMED
- **Affects user-facing accuracy:** True
- **Needs live data:** False
- **Settling query:** `SELECT target_institution_norm, source_institution_norm, count(*) AS rules FROM credit_transfer_rules WHERE is_active AND target_institution_norm IN ('WGU','TESU','COSC') AND source_institution_norm IN ('SOPHIA','STUDYCOM','CLEP','STRAIGHTERLINE') GROUP BY 1,2 ORDER BY 1,2; -- quantifies how often the heuristic is the sole basis; does not affect the verdict`
- **Evidence:** src/pages/EduTree/marketplace/hooks/useTransferVerification.ts:205-220 (TESU/COSC/EXCELSIOR→'verified'; SOPHIA/STUDYCOM/STRAIGHTERLINE/CLEP→'elective'; else 'review'), invoked at :160; src/lib/transferCoverage.ts:73, :91, :100-102; src/pages/EduTree/marketplace/components/TransferCoveragePanel.tsx:59-68 ('{coveragePercent}% covered' / '{coveredPairs} of {totalPairs} transferable courses have verified rules'); src/pages/EduTree/marketplace/components/TransferStatusBadge.tsx:42-47; src/pages/EduTree/marketplace/components/TemplateDetailDrawer.tsx:104
- **Verifier reasoning:** I enumerated every return path in useTransferVerification: the two early returns (:50-58, :72-80) and the no-providerCode branch (:140-149) are the only ones producing 'unknown', and all three are either behind `enabled: !!targetSchool` (:197) or skipped by transferCoverage's `if (!v.providerCode) continue` at :73. Every remaining path returns verified/elective/review. That makes coveragePercent a constant 100 for any non-empty set — no database state can change it, so this needs no live query to confirm. I then read the rendering components to check the claim was not about an unrendered value: the panel prints the percent and the sentence, and is mounted from TemplateDetailDrawer:104.

### 7. [HIGH] The cap arithmetic is correct and `maxTransferTotal` is genuinely never enforced, but the reachability claim is wrong on both halves. Verified by replay: bsba-cosc-cheapest-2025 = SOPHIA 57 + STUDYCOM

- **Verdict:** PARTIAL
- **Affects user-facing accuracy:** True
- **Needs live data:** False
- **Evidence:** node replay of templateValidator's metric loop over both fixture files; src/lib/degree/institutionPolicies.ts:126, :136, :204, :211, :297, :303; `grep -rn maxTransferTotal src/` → only institutionPolicies.ts definitions and verifiedPolicyService.ts:94,135,193; src/pages/admin/TemplateValidation.tsx:39 and src/pages/Admin/DegreeIntegrityScan.tsx:19 are the only importers of marketplace-v1-templates.json; src/app/routes.tsx:234,249 gate both behind ProtectedRoute requireAuth
- **Verifier reasoning:** I recomputed every fixture's creditsByProvider with a faithful port of templateValidator.ts:163-225 rather than trusting the quoted numbers — they matched exactly. I then attacked reachability, which is where the finding breaks: I grepped for importers of each fixture file and found the V1 file is admin-only, and I traced the fixtureMap key construction to show the two V2 offenders cannot be selected. I also ran validateNoncollegiate mentally against the COSC numbers: SOPHIA and STUDYCOM are both in COSC's includedProviders (:299), so unlike the WGU case the cap check does fire and the banner does appear.

### 8. [HIGH] Confirmed. `level` is a bare number on MarketplaceOption (v5.ts:60) with no evidence URL, source or verification date, unlike transfer rules which carry evidence_url; templateValidator.ts:192-194 and 

- **Verdict:** CONFIRMED
- **Affects user-facing accuracy:** True
- **Needs live data:** False
- **Evidence:** src/pages/EduTree/v5/types/v5.ts:60 (`level?: number; // Course level (100/200/300/400) for upper-division tracking`); src/pages/EduTree/v5/utils/templateValidator.ts:192-194, :213-216; src/pages/EduTree/v5/utils/anchorPolicyAdapter.ts:93-95; src/lib/degree/institutionPolicies.ts:157 (TESU 18), :308 (COSC 15), :355 (SNHU 30); node replay of upperDivCredits per fixture
- **Verifier reasoning:** I read the MarketplaceOption type to confirm `level` carries no provenance fields at all, then read both level-crediting branches in templateValidator and the provider-agnostic one in anchorPolicyAdapter. I searched for any code that cross-checks an asserted level against institutional data and found none. I recomputed upperDivCredits per template rather than trusting the quoted splits. I looked for a guard that would make this safe — e.g. a rule field recording the target course's level — and credit_transfer_rules exposes target_course_code but nothing in the resolution path reads a level from it.

### 9. [HIGH] The mechanism is confirmed exactly as described and the parenthetical about unreachable fixtures is the more certain half. fixtureMap is keyed `${t.anchorSchool}-${t.optimization}` with last-write-win

- **Verdict:** PARTIAL
- **Affects user-facing accuracy:** True
- **Needs live data:** True
- **Settling query:** `SELECT institution_code, lower(replace(track_type,'_','-')) AS norm_track, count(DISTINCT program_code) AS distinct_programs, array_agg(DISTINCT program_code) FROM degree_templates WHERE status='active' GROUP BY 1,2 HAVING count(DISTINCT program_code) > 1 ORDER BY 1,2;`
- **Evidence:** src/hooks/useMarketplaceTemplates.ts:422-424, :529, :540-547; src/types/optimizationTypes.ts:41-67; fixture array order in marketplace-v2-templates.json (cs-…-fastest at index 1, business-admin-…-fastest at index 4); supabase/migrations/20260217133250_*.sql lines 16,52,88 (all track_type 'multi-school')
- **Verifier reasoning:** I read the map construction, the lookup and the spread and confirmed each. I enumerated the fixture `optimization` values from the JSON and the complete output set of normalizeOptimization from its switch, and intersected them to establish exactly which three keys can match — the auditor's parenthetical is correct and is actually the larger problem. I checked array order in the fixture file to confirm which entry wins each colliding key. I then looked for committed rows that would trigger the collision and found the only committed degree_templates INSERT uses a track_type that cannot match any fixture, so the collision cannot be confirmed without the live table.

### 10. [HIGH] Confirmed, and I found the evidence that closes it. anchorPolicyAdapter.ts:32-43 maps only tesu/thomas edison/wgu/western governors/cosc/charter oak and falls back `codeMap[normalized] || 'TESU'` at :

- **Verdict:** CONFIRMED
- **Affects user-facing accuracy:** True
- **Needs live data:** False
- **Evidence:** src/pages/EduTree/v5/utils/anchorPolicyAdapter.ts:32-43, :45-52, :58-67, :69-75; src/pages/EduTree/v5/state/usePlanBasket.ts:86 (`target_school?: string`); src/lib/degree/institutionPolicies.ts:396-400; src/lib/degree/useAvailableInstitutions.ts:170-175, :192-205, :207-228; src/pages/EduTree/v5/components/AnchorSchoolSelector.tsx:92; consumers EduTreeV5Page.tsx:457, EduTreeV6Page.tsx:212, DecisionDockRouter.tsx:1213,1258
- **Verifier reasoning:** I read the adapter and then went looking for the escape hatch — the object branch that would let a non-registry code through and make the null handler live. It is dead because the Constraints type declares target_school as a plain string, which I verified at usePlanBasket.ts:86. I then attacked reachability from the other side: if the selector only ever offered TESU/WGU/COSC the coercion would be harmless. It does not — useAvailableInstitutions appends the full static registry (which includes UMGC and SNHU) with no V1 gate, and every scrape_url_templates code as 'draft'. That makes at least two coerced institutions certain regardless of DB contents.

### 11. [CRITICAL] Confirmed, with one consumer misattributed and one sharper instance the finding missed. The numeric contradictions are exactly as cited: src/lib/degree/institutionPolicies.ts:293 (COSC maxTransferTota

- **Verdict:** CONFIRMED
- **Affects user-facing accuracy:** True
- **Needs live data:** False
- **Evidence:** src/lib/degree/institutionPolicies.ts:293,303,200,204,211; supabase/migrations/20260109044935_ce489524-4858-4486-becc-1ae49a5e471d.sql:53-54,66-67; supabase/migrations/20260111183654_718c5824-0f31-4600-ab11-4c9bf33792eb.sql:31; supabase/migrations/20260111181442_bae0c6ff-1a10-4727-9a51-9f15e4dfa635.sql:70; src/pages/EduTree/v5/engine/deadEndDetector.ts:84-85; src/pages/EduTree/v5/hooks/usePlanBasketWithToasts.ts:60-69; src/pages/EduTree/v5/utils/templateValidator.ts:145-146,277; src/pages/EduTree/v5/EduTreeV5Page.tsx:1327; src/pages/Admin/DegreeIntegrityScan.tsx:22,117; src/app/routes.tsx:249; src/lib/degree/verifiedPolicyService.ts:136; src/pages/EduTree/v5/components/PolicyCard.tsx:124
- **Verifier reasoning:** I read institutionPolicies.ts in full and both migrations. Every quoted number is present at or within two lines of the cited position. I then traced every importer of the file with grep: of the five engine-side consumers, integrityScanner is reachable only from an /admin route, so I removed it from the claim. deadEndDetector's values do reach users — checkForDeadEnd's reason strings are rendered as toast.error descriptions. I searched tests/ and all *.test.ts for any assertion tying institutionPolicies.ts to institution_policy_ground_truth and found none, so nothing reconciles the two. I looked for a downstream override that would make the TS value moot and found the opposite: verifiedPolicyService reads a policy_data key that does not exist, so the TS constant wins even on the 'verified' path.

### 12. [HIGH] Confirmed, and the exposure is wider than the finding states in one direction and narrower in another. All cited code is exactly as described: institutionPolicies.ts:18 (InstitutionCode union of 5), :

- **Verdict:** CONFIRMED
- **Affects user-facing accuracy:** True
- **Needs live data:** False
- **Evidence:** src/lib/degree/institutionPolicies.ts:18,377-383,406,427,448,504,586; src/pages/EduTree/v5/engine/deadEndDetector.ts:82-89; src/lib/degree/useAvailableInstitutions.ts:170,192-205,207-231; src/pages/EduTree/v5/components/AnchorSchoolSelector.tsx:42-51,62-63; src/lib/planScoring/config.ts:37-41; src/app/routes.tsx:93,130,141; src/pages/EduTree/v5/utils/anchorPolicyAdapter.ts:32-43,55-67; src/pages/EduTree/v5/utils/templateValidator.ts:277; supabase/migrations/20260111183654_718c5824-0f31-4600-ab11-4c9bf33792eb.sql:37 (EXCELSIOR ground-truth residency 9)
- **Verifier reasoning:** I verified every default line by reading the file. I then attacked reachability from both ends. Looking for a gate that would stop a user selecting an out-of-registry school, I found useAvailableInstitutions — and it makes the problem worse, not better: only the active-pack branch is V1-gated, while the static branch and the scrape_url_templates branch append codes unconditionally. Looking for a gate that would limit blast radius, I found VERIFIED_SCHOOL_CODES, whose header comment (config.ts:27-36) documents the 2026-08-03 trimming of EMPIRE and EXCELSIOR from the public surface; that legitimately confines the damage to the authed planner, so I downgraded critical to high. I grepped every caller of validateUpperDivision and validateNoncollegiateCredits: the former has no production caller, so I struck that half of the detail.

### 13. [HIGH] Half right. CONFIRMED for `max_noncollegiate_credits`: the string occurs exactly once in the entire repository, at verifiedPolicyService.ts:73, and the canonical policy_data schema (supabase/functions

- **Verdict:** PARTIAL
- **Affects user-facing accuracy:** True
- **Needs live data:** False
- **Settling query:** `SELECT institution, status, policy_data ? 'upper_division_min' AS has_ud_key, policy_data ? 'max_noncollegiate_credits' AS has_noncoll_key FROM institution_policy_packs WHERE status = 'active' ORDER BY institution;`
- **Evidence:** src/lib/degree/verifiedPolicyService.ts:73-74,85,133-137,207-209; supabase/functions/_shared/policyGate.ts:66-82 (esp. :76); supabase/migrations/20260111181442_bae0c6ff-1a10-4727-9a51-9f15e4dfa635.sql:32,60,83,105,127,149,171,193,215; supabase/migrations/20260417181349_3e0f5a25-6f0d-4532-bbd2-e98fc606a813.sql:84-105; supabase/migrations/20260111183654_718c5824-0f31-4600-ab11-4c9bf33792eb.sql:73,79,85; supabase/migrations/20260421200252_fe87a6c6-b5f2-42c8-9fb6-67f267714653.sql:115-121; supabase/migrations/20260113030751_d9167ad8-7077-4610-bc17-458601ef467b.sql:4-19; src/pages/EduTree/v5/components/PolicyCard.tsx:104-117,124
- **Verifier reasoning:** I grepped both key names across the whole repo rather than trusting the two cited migrations. max_noncollegiate_credits genuinely has one occurrence and it is the read itself — that half stands and is the one that produces a wrong number under a verified label. upper_division_min is a different story: it is in the canonical PolicyData interface and migration 20260111181442 writes it flat for nine institutions, which is precisely the guard the finding missed. I then re-derived the TypeError chain under that correction and found it survives only for packs lacking the key, checked which committed packs those are, and checked whether they can actually go active (the EMPIRE/EXCELSIOR drafts cannot, because Gate 4's max_alt provenance check blocks them). I also traced what the catch actually produces and found the UI marks it unverified, which weakens the stated harm. needs_live_data is false 

### 14. [HIGH] Confirmed on every citation, with the blast radius sharpened. The gate reads only flat keys (20260421200252:75-78, documented at docs/TRUST_GATE_REQUIREMENTS.md:28). useInstitutionPolicyPack.ts:44-53 

- **Verdict:** CONFIRMED
- **Affects user-facing accuracy:** True
- **Needs live data:** False
- **Evidence:** supabase/migrations/20260421200252_fe87a6c6-b5f2-42c8-9fb6-67f267714653.sql:75-78; docs/TRUST_GATE_REQUIREMENTS.md:28; src/lib/degree/useInstitutionPolicyPack.ts:44-53; supabase/migrations/20260417181349_3e0f5a25-6f0d-4532-bbd2-e98fc606a813.sql:64-82; supabase/migrations/20260111183654_718c5824-0f31-4600-ab11-4c9bf33792eb.sql:72,78,84; supabase/migrations/20260109210411_9b038b10-1978-44fc-898b-060568680a92.sql:36-46; src/pages/EduTree/v5/components/AnchorSchoolSelector.tsx:26,33-35,62-63; src/pages/EduTree/v5/components/MarketplacePanel.tsx:170-179
- **Verifier reasoning:** Every citation checks out on inspection, including the dotted jsonb_set path, which is a single key containing a dot and so is genuinely unreadable by the trigger's field_provenance->'residency_credits' access. The attack I ran was on reachability: I traced all five consumers of useInstitutionPolicyPack. EduTreeV5Page.tsx:272 turns out to use only policyData?.source for telemetry (:1658), which I removed from consideration, but AnchorSchoolSelector renders the numbers as badges and MarketplacePanel feeds them into the alt-cap warning path, so the user-facing claim holds. I then checked whether the defaults are actually wrong for LIBERTY and found two of three coincide with its real values, which I noted rather than let the finding imply three fabrications.

### 15. [CRITICAL] Confirmed. The badge status is derived only from acceptance_status (useTransferVerification.ts:175-179) and the query (:84-95) selects * with no is_active/status/verified/data_quality/evidence_url pre

- **Verdict:** CONFIRMED
- **Affects user-facing accuracy:** True
- **Needs live data:** False
- **Evidence:** src/pages/EduTree/marketplace/hooks/useTransferVerification.ts:84-95 (query), :175-179 (status mapping), :202-216 (getHeuristicStatus); src/pages/EduTree/marketplace/components/TransferStatusBadge.tsx:43-47 ('Verified' + CheckCircle2), :119-133 (popover assertions); src/pages/EduTree/marketplace/components/TemplateDetailDrawer.tsx:362-372; src/app/routes.tsx:163-174; supabase/migrations/20251022185011_227e1c5a-4cea-4ffa-848e-c7091bb37140.sql:34-37 (public read USING (true)).
- **Verifier reasoning:** Read the hook end to end and confirmed the exact expressions. Grepped every CREATE POLICY touching credit_transfer_rules across all migrations to look for a row-level provenance filter that would make the client query safe - there is none, both policies are USING (true). Grepped src/pages/EduTree, src/pages/public and src/components/plan for any read of `.verified` or `data_quality` on a transfer rule - zero hits. Checked routes.tsx to confirm the marketplace route is a normal authenticated production route rather than DEV-gated. Confirmed TransferStatusBadge's STATUS_CONFIG maps 'verified' to a green CheckCircle2 labelled 'Verified'.

### 16. [HIGH] Confirmed, with one mechanical correction that matters for blast radius. EQUIVALENCY_PAGE_PATTERNS (:31-40) is a static map, the worker contains zero fetch() calls (verified by count), and :167-172 as

- **Verdict:** CONFIRMED
- **Affects user-facing accuracy:** True
- **Needs live data:** True
- **Settling query:** `SELECT target_institution, evidence_url, COUNT(*) FROM credit_transfer_rules WHERE evidence_url IN ('https://www.tesu.edu/transfer-credit','https://www.wgu.edu/admissions/transfers.html','https://www.excelsior.edu/admissions/transfer-credit/','https://www.esc.edu/transfer-credit/','https://www.charteroak.edu/catalog/current/academic_policies_regulations/course_transfer_policy.php') GROUP BY 1,2 ORDER BY 3 DESC;`
- **Evidence:** supabase/functions/evidence-backfill-worker/index.ts:31-40, :156-178, :247-260 (grep -c 'fetch(' returns 0); supabase/functions/url-verify-worker/index.ts:265-330 (firecrawl), :440,475,512,539,581,616,640,687 (all .from('alt_credits')); supabase/config.toml:78; supabase/migrations/20260113160411_6e61789f-ebac-4fa0-938b-be1c037312ce.sql:51,82; docs/EDGE_FUNCTION_AUDIT.md:85.
- **Verifier reasoning:** Read the whole worker. Counted fetch() occurrences: zero. Traced every .from() in url-verify-worker to confirm the auditor's contrast claim is exact - it is. Then attacked reachability: grepped the entire repo for callers and found a pg_cron registration ('evidence-backfill-worker-15m') plus a config.toml entry and a release doc, so it is not dead code. The only thing I could break was the implication that confidence 0.6 lands on the rule - it does not; the UPDATE payload at :253-256 is exactly {evidence_url, evidence_type}. Downgraded critical to high on that basis.

### 17. [HIGH] The code behaviour is exactly as described and I verified every line: validate-transfer-candidates/index.ts:374-388 inserts rule_source:'ai_validated', confidence:combinedScore, evidence_url:null, ver

- **Verdict:** PARTIAL
- **Affects user-facing accuracy:** True
- **Needs live data:** True
- **Settling query:** `SELECT data_quality, rule_source, verified, COUNT(*), COUNT(evidence_url) FROM credit_transfer_rules WHERE rule_source IN ('ai_validated','ai_extraction','ai_validated_human_approved') GROUP BY 1,2,3;`
- **Evidence:** supabase/functions/validate-transfer-candidates/index.ts:300-302 (SELECT list without evidence_url), :298 (auto_promote_threshold = 0.80), :356-357 (sqrt combination), :374-388 (insert); supabase/functions/generate-transfer-rules/index.ts:226 (evidence_url: evidenceUrl || null), :78-80 (model self-assigned confidence ladder), :256-257 (only caller); src/lib/tieredSavingsCalculator.ts:58-63 (Tier A requires evidence_url).
- **Verifier reasoning:** Read the insert payload, the candidate SELECT list and the scoring line directly - all match. Then I looked for what would refute it: a DB trigger or CHECK constraint forcing evidence_url when verified=true (none exists on credit_transfer_rules), and a downstream consumer of the `verified` column (none in the frontend). The genuine correction came from the other direction: evidence_url:null is self-limiting for Tier A, so the finding's framing of this as the path to fabricated 'guaranteed savings' is wrong. Reachability is the open question - the function is only invoked internally by generate-transfer-rules, which I could not tie to any cron, so prevalence needs production.

### 18. [HIGH] The trust claims are real and unsupported, but the query description is wrong in two places. CONFIRMED: :177 renders `{schoolRows.length} verified rule{s}` from the raw row count; :156-158 says 'We on

- **Verdict:** PARTIAL
- **Affects user-facing accuracy:** True
- **Needs live data:** False
- **Evidence:** src/pages/public/TransferCheckPage.tsx:8-9 (header claims last-verified dates), :37, :62-67 (query incl. the VERIFIED_SCHOOL_CODES filter at :65), :96-98 (meta), :112, :156-158, :177, :185-188, :189-199; src/lib/planScoring/config.ts:37-41; src/app/routes.tsx:273.
- **Verifier reasoning:** Read the file top to bottom rather than only the cited ranges, which is how I caught the .in() filter at :65 and the acceptance_status render at :186 that the quoted evidence omitted. Confirmed last_verified_at appears exactly twice in the file (type declaration and select list) and never in JSX. Checked VERIFIED_SCHOOL_CODES to confirm the allowlist is TESU/COSC/WGU. Confirmed the evidence anchor uses r.evidence_url raw with no sanitizer - unlike TransferStatusBadge, which does call one. The two corrections narrow the claim but do not touch the core: a public SEO page asserts source-document verification for rows selected without any provenance predicate.

### 19. [HIGH] The mechanism is confirmed exactly; the row count is overstated by about 75%. CONFIRMED: tieredSavingsCalculator.ts:58-63 gates Tier A on `!!rule.evidence_url && rule.evidence_url.startsWith('http')` 

- **Verdict:** PARTIAL
- **Affects user-facing accuracy:** True
- **Needs live data:** True
- **Settling query:** `SELECT target_institution, evidence_url, data_quality, COUNT(*) FROM credit_transfer_rules WHERE COALESCE(confidence,0) >= 0.9 AND evidence_url LIKE 'http%' AND is_active GROUP BY 1,2,3 ORDER BY 4 DESC;`
- **Evidence:** src/lib/tieredSavingsCalculator.ts:52-73; src/types/evidenceTiers.ts:61, :100, :102, :111-113; src/pages/EduTree/marketplace/components/StrategySavingsBanner.tsx:216-240; src/pages/EduTree/marketplace/components/TemplateCard.tsx:216, :231; supabase/migrations/20260416165954_129af9b0-deed-4894-b510-9d6cd587bb38.sql (69 rows, study.com/college/school/excelsior-college.html), 20260416173853_aa55eacd-4a04-4d72-9021-254989fe2459.sql (20 rows, sophia.org/wgu), 20260416174723_f25161df-10b8-4969-8e05-60d1d2ed1759.sql (21 rows, study.com/wgu), 20260416164146_dd2b8ad2-34cd-42fe-84d9-d6e9d2d1db05.sql, 20260416163710_f82f7f44-d120-4c81-ba26-3f5f81ad5e15.sql.
- **Verifier reasoning:** Read classifyTier and the threshold constants directly. Attacked user-facing reachability first, since a dead calculator would sink the finding: traced calculateTieredSavings to TemplateCard:216 and the tier counts and dollar split to StrategySavingsBanner, which TemplateCard renders at :600 - it is live. Opened all five migrations and mechanically counted VALUES rows, which is how I caught the 350 overstatement. Also grepped MIN_POLICY_CONFIDENCE_FOR_TIER_A across src and found it is defined but never read, which corrects the finding's stated mechanism for why policy never gates Tier A.

### 20. [HIGH] Confirmed, and the true state is worse than the finding states. verifiedPolicyService.ts:125-131 sets verified: hasRequiredValues and confidence: hasRequiredValues ? 95 : 75, and :141 sets verifiedAt:

- **Verdict:** CONFIRMED
- **Affects user-facing accuracy:** True
- **Needs live data:** False
- **Evidence:** src/lib/degree/verifiedPolicyService.ts:58-76 (parsePolicyData), :105-113 (live view query), :125-131, :141; src/pages/EduTree/v5/components/PolicyVerificationBadge.tsx:32-36, :102-105; src/pages/EduTree/v5/components/PolicyCard.tsx:55-68; src/pages/EduTree/v5/EduTreeV5Page.tsx:1401; supabase/migrations/20260109170551_c158fc4b-ad89-418b-8812-64ac7f23500e.sql:5-15, :22-26.
- **Verifier reasoning:** The obvious refutation was that institution_policy_packs_live might already enforce provenance, letting the service legitimately skip those columns - so I pulled the view definition. It filters only status <> 'deprecated'. I then found the CHECK constraint in the same migration, which is what converts hasRequiredValues from a test into a tautology. Traced the render chain PolicyCard -> PolicyVerificationBadge -> EduTreeV5Page:1401 to confirm this is a live user-facing badge rather than an admin surface, and read the badge's own copy to confirm it asserts 'verified from official sources' next to a created_at timestamp.

### 21. [HIGH] The core is confirmed but the trigger is meaningfully more restrictive than the finding implies, and the provenance-stamping claim conflates two different fields. CONFIRMED: prePromotePolicyPack.ts:20

- **Verdict:** PARTIAL
- **Affects user-facing accuracy:** True
- **Needs live data:** True
- **Settling query:** `SELECT institution, status, policy_data->>'residency_credits' AS residency, field_provenance->'residency_credits'->>'source' AS res_src, field_provenance->'degree_credit_total'->>'source' AS total_src, policy_data->>'provenance_verified_by' AS prov_by, policy_data->>'provenance_verified_at' AS prov_at FROM institution_policy_packs WHERE status='active' ORDER BY institution;`
- **Evidence:** supabase/functions/_shared/prePromotePolicyPack.ts:207-211, :213-245, :247-278, :280-305, :407-431; supabase/migrations/20260421200008_*.sql:1-3, :43-56 (GATE 1), :55-66 (GATE 2), :68-71 (GATE 3), :83-94 (safe ranges), :100-131 (provenance gates), :135-140 (GATE 5 ground truth), :142-157 (GATE 6), :158-178 (GATE 7); supabase/migrations/20260421200358_*.sql:1-16; src/lib/degree/useAvailableInstitutions.ts:124-133; docs/pipeline-health/AUDIT_ADDENDUM_2026-05-21.md:25.
- **Verifier reasoning:** I read the entire activation trigger rather than the two ranges cited, which is what surfaced the ground-truth requirement, the hard refusal of auto_defaulted max_transfer_credits, and the confidence floors - all guards the finding does not mention. I then grepped prePromotePolicyPack for every provenance_verified_at write and compared against what GATE 7 and useAvailableInstitutions read (NEW.policy_data->>'provenance_verified_at' and pd.provenance_verified_at, both top-level): the function writes only nested field-level values, so the finding's 'stamps provenance_verified_at = now()' is true at field level but the top-level clock comes from the separate backfill migration. Confirmed the 180-day window and the addendum's scrape dates. Marked PARTIAL on those two corrections; needs_live_data preserved because which packs are active with which provenance sources is a production question.

### 22. [HIGH] Confirmed in both implementations. validate-transfer-candidates/index.ts:394-408 selects legacy rules matching only source_institution, target_institution, data_quality='legacy_unverified', is_active=

- **Verdict:** CONFIRMED
- **Affects user-facing accuracy:** True
- **Needs live data:** True
- **Settling query:** `SELECT source_institution, target_institution, COUNT(*) FILTER (WHERE is_active) AS active, COUNT(*) FILTER (WHERE NOT is_active AND superseded_by IS NOT NULL) AS superseded FROM credit_transfer_rules GROUP BY 1,2 ORDER BY superseded DESC;`
- **Evidence:** supabase/functions/validate-transfer-candidates/index.ts:394-408; supabase/migrations/20260416162238_*.sql:42-59; supabase/migrations/20260416153604_*.sql:59-63; supabase/migrations/20260416154114_*.sql:17-27 (active_transfer_rules filters is_active); src/pages/public/TransferCheckPage.tsx:64; src/pages/EduTree/marketplace/hooks/useTransferVerification.ts:84-95.
- **Verifier reasoning:** Read both the edge-function supersede block and the migration join predicate directly; neither constrains source_course_code, so the quoted defect is exactly as described. I looked for refutations in three places: a DB constraint or trigger that would block the mass deactivation (none exists on this table), a course-code filter applied by a caller before the update (the update is self-contained), and whether the two read surfaces really disagree on is_active (they do - I read both queries). The one thing code cannot settle is whether the path has fired in production, so I kept needs_live_data true for magnitude while the code defect itself is fully established.

### 23. [HIGH] CONFIRMED FROM CODE: /transfer-check (public, live at src/app/routes.tsx:273) filters only .eq('is_active', true) + .in('target_institution', VERIFIED_SCHOOL_CODES) (TransferCheckPage.tsx:63-67) — no 

- **Verdict:** PARTIAL
- **Affects user-facing accuracy:** True
- **Needs live data:** True
- **Settling query:** `SELECT target_institution, acceptance_status, data_quality, verified, (evidence_url IS NULL) AS no_evidence, count(*) FROM credit_transfer_rules WHERE is_active = true AND target_institution IN ('TESU','COSC','WGU') GROUP BY 1,2,3,4,5 ORDER BY 1,6 DESC;`
- **Evidence:** src/pages/public/TransferCheckPage.tsx:63-67 (query), :177 (badge), :184 (accepted fallback), :185-186 (status parenthetical), :189-196 (evidence link IS rendered), :242-245 (disclaimer). src/app/routes.tsx:273. supabase/migrations/20260416153604_5c5e6dc2-9116-4a3f-81a9-28ffa43fd6b2.sql (final UPDATE: `SET data_quality = 'legacy_unverified' WHERE target_institution = 'TESU' AND verified = false`). Writer path that can create rejected+active rows: supabase/functions/transfer-scraper-validate/index.ts:283-299 inserts into credit_transfer_rules with `acceptance_status: rule.acceptance_status === 'not_accepted' ? 'rejected' : 'accepted'` and never sets is_active, which defaults true per supabase/migrations/20260416154114_f247aefc-4778-48a4-8659-c3d82b013930.sql:4. Counter-evidence: the one seeded 'rejected' row (SOPHIA/SOPH-COMM-101→WGU, supabase/migrations/20251022184939_...sql:156) was downgraded to 'elective' by supabase/migrations/20260112030443_aa418218-bc4e-410f-b933-7c3d3d62a26f.sql:15-19. Contrast canonical path src/shared/lib/api/transferRules.ts:39 `.eq('acceptance_status','accepted')`.
- **Verifier reasoning:** I read the full component. The query and all four render sites exist exactly as cited. I attacked the finding three ways: (1) looked for a downstream guard — there is none, the only qualifying text is an 11px disclaimer at :242-245, separated from the badges by a CTA card and the provider strip; (2) checked reachability — the route is public and unauthenticated; (3) attacked the 'rejected' sub-claim, which is where it weakens. The auditor's two cited sources for 'rejected' being an allowed value are both wrong (an admin JSX string and a different table's CHECK). I then found a better source they missed: transfer-scraper-validate/index.ts:288 genuinely writes 'rejected' into credit_transfer_rules with is_active defaulting true. But I also found migration 20260112030443 which converted the only seeded 'rejected' row to 'elective'. So the 'rejected' scenario is mechanically possible but unp

### 24. [HIGH] The framing half is CONFIRMED and the sourcing half is REFUTED — and the real defect is worse than, but different from, what was claimed. CONFIRMED: VERIFIED_SCHOOL_CODES is TESU/COSC/WGU only (config

- **Verdict:** PARTIAL
- **Affects user-facing accuracy:** True
- **Needs live data:** False
- **Evidence:** src/lib/planScoring/config.ts:25, :27-36, :37-41. src/content/guides/sophia-learning-transfer-guide.tsx:18 (heading), :40-43 (Excelsior 117), :45-48 (Purdue 75%), :50-53 (UMGC 90), :29-38 (TESU/COSC 90). src/content/guides/straighterline-vs-sophia-vs-studycom.tsx:62-65, :88-96. src/content/guides/cheapest-online-bachelors-2025.tsx:59-64, :71-76. Purdue Global record: src/lib/institutionUrls.ts:96-98; src/types/degreeTemplates.ts:11; supabase/migrations/20260111181442_bae0c6ff-1a10-4727-9a51-9f15e4dfa635.sql:197-217 ('degree_credit_total', 180 … 'max_total_transfer', 135). UMGC: same migration :176-194 ('max_total_transfer', 90). SNHU: supabase/migrations/20251022184836_bb55f4da-7677-47b8-9028-1dd28ab23b93.sql:86. Excelsior seed 108/81: supabase/migrations/20260111183654_718c5824-0f31-4600-ab11-4c9bf33792eb.sql:82-86. TESU 117: supabase/migrations/20260113030751_d9167ad8-7077-4610-bc17-458601ef467b.sql:13. Guide git history: `git log -1` on each of the five .tsx bodies → 93dac55 2026-04-17.
- **Verifier reasoning:** I confirmed every guide citation and the scope lists. Then I attacked the 'no source anywhere' assertion by grepping PURDUE/SNHU/117/108 across src/ and supabase/ — and it collapsed. Purdue Global is not in the V1/V2 scope lists (correct), but it has a full seeded policy pack, an institutionUrls entry, a degreeTemplates union member, and two name aliases in useAvailableInstitutions.ts:39,46; its 135/180 seed reproduces the guide's 75% exactly. UMGC's 90 and SNHU's 90 likewise trace to seeds. So the guide numbers are not invented — three of five rows are traceable to committed data. What IS indefensible is the 117: the repo seeds Excelsior at 108, and 117 is TESU's number. That is a checkable internal contradiction worth ~9 credits (~$4.8k at the seeded Excelsior rate of $535), and the 'verified' heading over it is the honesty failure the finding was reaching for. Also note the addendum i

### 25. [HIGH] Four distinct TESU per-credit figures do ship, and two of them are flatly incompatible — but they are not all four mutually exclusive, and the residency basis matters. CONFIRMED: tesu-vs-cosc-bsba.tsx

- **Verdict:** PARTIAL
- **Affects user-facing accuracy:** True
- **Needs live data:** False
- **Evidence:** src/content/guides/tesu-vs-cosc-bsba.tsx:56-57. src/content/guides/finish-bachelors-under-10k.tsx:66, :129-130. src/pages/EduTree/v5/components/TESUDisclaimerBanner.tsx:27, :68. supabase/migrations/20260113052238_e5ab5075-5cf0-4705-be2f-53dec5a25c0b.sql:134-142 (per_credit_usd 564, required_fees_usd 250, effective_date 2024-09-01, notes naming $353 in-state). Live consumption of the seed: src/pages/EduTree/v5/hooks/usePricingMaps.ts:41-45; src/pages/EduTree/v5/EduTreeV5Page.tsx:118. Negative grep: `419` and `469` return no pricing hits anywhere under supabase/migrations or src/lib.
- **Verifier reasoning:** All four strings verified in place. I attacked by checking whether any figure is reconcilable with another under a stated assumption — the banner's ~$400 is explicitly NJ-resident, so pairing it against an out-of-state $564 is not a fair contradiction (though $400 still does not equal the seed's stated $353 in-state). That knocks 'four mutually exclusive ways' down to 'two irreconcilable out-of-state figures plus two unsourced ones.' I then grepped for 419/469 to see if the guide figures had any provenance: none. I also checked whether the seed is dead data — it is not; usePricingMaps loads it into the v5 planner, which makes the guide-vs-planner divergence a live inconsistency a single user can hit. The auditor's downstream arithmetic ($564 × 30 = $16,920, defeating the guide's "$15,000 instead of $50,000+" at tesu-vs-cosc-bsba.tsx:130-131) is correct. Severity held at high rather than 

### 26. [HIGH] The code trace is CONFIRMED end to end; whether the fallback ever fires needs a live query, and one illustrative example in the detail is impossible. CONFIRMED: ComparePage.tsx:296 prints "Costs & tim

- **Verdict:** PARTIAL
- **Affects user-facing accuracy:** True
- **Needs live data:** True
- **Settling query:** `SELECT institution_code, program_code, track_type, status, estimated_cost, estimated_duration_months, (template_data->>'planWeeks') AS plan_weeks FROM degree_templates WHERE status = 'active' AND institution_code IN ('TESU','COSC','WGU') ORDER BY institution_code, program_code;`
- **Evidence:** src/pages/Compare/ComparePage.tsx:296 (footer), :43 (VERIFIED_SET), :50 (useMarketplaceTemplates), :80 (buildCompareRows), :228-234 (savings sentence is the H1). src/pages/Compare/buildCompareRows.ts:84, :121-127 (penalty-vs-best). src/lib/planScoring/scorePlan.ts:28-30. src/hooks/useMarketplaceTemplates.ts:538, :546 (and a second identical fallback at :766), :377-384, :389-403. src/pages/Compare/compareInsights.ts:73-75. Zero grep hits for `providerPricing` under src/pages/Compare/.
- **Verifier reasoning:** I walked the whole chain file by file rather than trusting it, and every hop holds; the line numbers are off by 2-5 but the code is exactly as described, and there is a SECOND identical `|| fixture.totals.costUsd` fallback at :766 the auditor missed. I attacked for a guard: there is no NULL check, no isEstimated flag surfaced on /compare, and no disclaimer anywhere on the page. I attacked the SNHU example and it fails — the VERIFIED_SET filter at :43 makes it unreachable, so that specific sentence is fabricated even though the pattern it illustrates is genuine. Kept at high rather than downgrading: the footer makes a provenance assertion the code does not check, sitting under an H1 that is a bare dollar claim with no hedge, on the page where the cost comparison actually happens. But it stays PARTIAL because whether any active TESU/COSC/WGU template has a NULL or 0 estimated_cost — the co

### 27. [HIGH] An active seeded template (degree_templates id 'it-bachelor-wgu-multischool-2025') carries the summary "Complete your IT degree by transferring Sophia/Study.com credits to WGU", and its fixture twin c

- **Verdict:** PARTIAL
- **Affects user-facing accuracy:** True
- **Needs live data:** True
- **Settling query:** `SELECT id, institution_code, track_type, status, template_data ? 'yearTemplates' AS has_years FROM degree_templates WHERE id='it-bachelor-wgu-multischool-2025'; SELECT * FROM template_baseline_snapshots WHERE template_id='it-bachelor-wgu-multischool-2025';`
- **Evidence:** supabase/migrations/20260217133250_2e0323be-eb24-4511-a142-33a306275601.sql:11 (id), :22 (summary), :42 (status 'active'); fixture index 8 of src/fixtures/templates/marketplace-v2-templates.json parses to exactly 20 SOPHIA (60cr) + 10 STUDYCOM (30cr) + 6 WGU (30cr) options; src/lib/degree/institutionPolicies.ts:203-207 (WGU noncollegiatePool.includedProviders = ACE/NCCRS/CLEP/DSST/AP, comment 'WGU does NOT accept Sophia or Study.com', maxCreditsBachelor 78); grep for isNoncollegiateProvider across src/ returns only institutionPolicies.ts:436 and institutionPolicies.test.ts; src/lib/degree/institutionPolicies.ts:498-516 (validateNoncollegiateCredits sums only providers in includedProviders) called at src/pages/EduTree/v5/utils/templateValidator.ts:22,277; src/hooks/useMarketplaceTemplates.ts:450-482 (mergeBaseline nulls the baseline without a snapshot); supabase/migrations/20260113052238_e5ab5075-5cf0-4705-be2f-53dec5a25c0b.sql:268-308 (the only snapshot backfill, ran 2026-01-13, a month before the template was inserted; no trigger on degree_templates exists). Corroboration the original auditor missed: supabase/migrations/20251022184836_bb55f4da-7677-47b8-9028-1dd28ab23b93.sql:156 s
- **Verifier reasoning:** I opened the migration and confirmed all three cited lines verbatim. I parsed the fixture's yearTemplates and got the exact provider counts claimed. I read the WGU policy block and confirmed the comment and the excluded providers. I grepped for every consumer of includedProviders and found one production reader (validateNoncollegiateCredits via templateValidator, rendered by TemplateValidationBanner at EduTreeV5Page.tsx:1324) — but it filters ineligible providers OUT of the total rather than flagging them, so it cannot catch this. I then attacked the savings figure: mergeBaseline overrides template_data.singleSchoolBaseline with null unless template_baseline_snapshots has a verified row, and I searched every migration for snapshot inserts — the only backfill predates this template and targets different ids. I also traced hydration: via the DB, useMarketplaceTemplate (useMarketplaceTempla

### 28. [HIGH] The V1-scope gate is applied only inside the policy-pack loop (useAvailableInstitutions.ts:170-176); the static branch (:192-205) and the scrape_url_templates branch (:207-232) add rows with no gate a

- **Verdict:** PARTIAL
- **Affects user-facing accuracy:** True
- **Needs live data:** True
- **Settling query:** `SELECT institution_code, count(*) FROM scrape_url_templates GROUP BY 1 ORDER BY 1; SELECT relname, relrowsecurity FROM pg_class WHERE relname='scrape_url_templates'; SELECT polname, polcmd, pg_get_expr(polqual, polrelid) FROM pg_policy WHERE polrelid='public.scrape_url_templates'::regclass;`
- **Evidence:** src/lib/degree/useAvailableInstitutions.ts:170-176 (isV1InstitutionAsync gate inside the pack loop only), :192-205 (static branch, status 'static', confidence 75, no gate), :207-232 (scrape_url_templates branch, status 'draft', confidence 50, comment 'Template-only = needs policy scraping', no is_active or V1 filter), :44-51 (display names for PHOENIX/STRAYER/PURDUEG/NU/UPEOPLE/UWFO/WALDEN/PSUWC); src/pages/EduTree/v5/components/AnchorSchoolSelector.tsx:41-51 and :62-66; src/lib/degree/institutionPolicies.ts:427 ('if (!policy) return 30; // Safe default') and :449 ('if (!policy) return 90; // Safe default'); migration seed aggregate across supabase/migrations/ gives scrape_url_templates rows for PHOENIX(5), STRAYER(5), PURDUEG(3), NU(3), UPEOPLE(3), UWFO(3), PSUWC(3), FRANKLIN(3), CSUG(3) among others; src/pages/EduTree/v5/utils/anchorPolicyAdapter.ts:32-43 (codeMap covers only tesu/wgu/cosc, everything else '|| TESU'). Route is behind auth: src/app/routes.tsx:130-131.
- **Verifier reasoning:** I read the whole hook, including the tail, to check for a final filter after the sort — there is none. I confirmed both accessor defaults and the selector's badge markup verbatim. I aggregated every INSERT/DELETE against scrape_url_templates across all 822 migrations to establish which codes survive. I then attacked the finding: the static branch's numbers are real, not fabricated, so the claim conflates two different defects; and I could not find a CREATE TABLE or CREATE POLICY for scrape_url_templates anywhere in migrations, so an RLS denial would make the draft branch silently empty for end users (the supabase client returns an error and the destructured data is undefined). Searching for what would make the badge harmless, I instead found the opposite: anchorPolicyAdapter collapses every unmapped anchor to TESU, so the invented numbers propagate into rendered warnings, not just a badg

### 29. [HIGH] The residency-by-providerType defect is real and appears in five places, including one the auditor missed that feeds the rendered degree summary (EduTreeV5Page.tsx:975-977 → the 'Need N more instituti

- **Verdict:** PARTIAL
- **Affects user-facing accuracy:** True
- **Needs live data:** False
- **Evidence:** src/pages/EduTree/v5/engine/deadEndDetector.ts:121 and :140; src/lib/degree/yearNodes.ts:98-99; src/pages/EduTree/v5/components/PolicyCard.tsx:37-39; src/pages/EduTree/v5/state/usePlanBasket.ts:525; plus src/pages/EduTree/v5/EduTreeV5Page.tsx:975-977 (uncited, and the one that drives the visible warning at :1001-1005). Counter-evidence: src/pages/EduTree/v5/engine/constraints.ts:370-371 filters on providerType === 'university' && providerCode === institutionCode; src/lib/degree/autoHeal.ts:46-61 rewrites that field; src/pages/EduTree/v5/EduTreeV5Page.tsx:301-308 calls healBasketForPolicy without maxTransferCredits and only console.logs (V6 at EduTreeV6Page.tsx:222-232 does show a toast); src/pages/EduTree/v5/components/PolicyCard.tsx:46-54 (isVerified gating); src/pages/EduTree/v5/hooks/useDeadEndGuard.ts:82-93 (BasketItem built with providerType, no providerCode).
- **Verifier reasoning:** I opened all five counters and confirmed each filters on providerType alone. I then tested the autoHeal link the finding asserts: since none of those counters reads providerCode, relabelling it cannot change their output — the causal story in the finding is backwards. Searching for a counter that would make autoHeal matter, I found constraints.ts:370-371, which is reached from EduTreeV5Page.tsx:446 via useDeadEndGuard's validateInstitutionPolicies; that one is genuinely defeated by the heal. I also traced the cost/time computation in the degree summary memo and confirmed residency is not an input, refuting the 'cost and time-to-degree are understated' conclusion. Finally I confirmed PolicyCard is the honest-uncertainty surface the dimension summary claims does not exist: it consumes verifiedPolicyService's verified flag and zeroes every meter when unverified.

### 30. [HIGH] applyTemplateToPlan hydrates a whole-degree basket with no per-course transfer-rule check, and the component its comment defers to does not exist anywhere in the repo (only two references, both commen

- **Verdict:** PARTIAL
- **Affects user-facing accuracy:** True
- **Needs live data:** False
- **Evidence:** src/pages/EduTree/v5/state/usePlanBasket.ts:399-505 (no checkTransferRule), :470 (the TransferVerificationBadge comment), :492-498 (transferStatus set only when providerCode === anchorSchool); `find . -name 'TransferVerificationBadge*' -not -path '*/node_modules/*'` returns nothing; the only two references repo-wide are usePlanBasket.ts:470 and docs/V1_COMPLIANCE_AUDIT.md:149; contrast src/pages/EduTree/v5/hooks/useApplyTemplate.ts:74-97 (blocks on failure) and src/pages/EduTree/v5/engine/transferEngine.ts:155-160 (strict no-rule → accepted:false). Counter-evidence: src/pages/Compare/ComparePage.tsx:170-182; src/pages/EduTree/v5/EduTreeV5Page.tsx:1324-1330 (TemplateValidationBanner render site).
- **Verifier reasoning:** I read applyTemplateToPlan end to end and confirmed there is no checkTransferRule call and that transferStatus is left undefined for every non-institutional course. I ran the find and the repo-wide grep and confirmed the component is absent with exactly two textual references. I then attacked the reachability claim: I read handleViewPlan in ComparePage and it routes to /plan/preview, and grepping for who navigates to /edu-tree-v5?templateId= returns only the two marketplace components — so the funnel attribution in the finding is wrong. I also found a guard the auditor missed, TemplateValidationBanner, which does run a real (non-transfer) policy validation on the applied template, so the 'no validation whatsoever' phrasing overstates.

### 31. [HIGH] The key mismatch is confirmed: fixtureMap is keyed on the raw fixture optimization string while the lookup uses normalizeOptimization(track_type), so only TESU-fastest, TESU-balanced and WGU-balanced 

- **Verdict:** PARTIAL
- **Affects user-facing accuracy:** True
- **Needs live data:** True
- **Settling query:** `SELECT institution_code, track_type, program_code, count(*) FROM degree_templates WHERE status='active' GROUP BY 1,2,3 ORDER BY 1,2;`
- **Evidence:** src/hooks/useMarketplaceTemplates.ts:420-424 (raw key) vs :528-530 (normalized lookup key); src/types/optimizationTypes.ts:44-66 (normalizeOptimization: 'cheapest'→'alt-credit', 'multi-school-cheapest'→'multi-school'); fixture optimization values parsed from src/fixtures/templates/marketplace-v2-templates.json are cheapest/fastest/balanced/multi-school-cheapest, with indices 0-2 cs-bachelor-tesu-* and 3-5 business-admin-bachelor-tesu-*; :534-552 spreads ...fixture overriding only id/credits/cost/weeks; second instance at :748. Counter-evidence: supabase/migrations/20260217133250_*.sql seeds exactly three rows, all track_type 'multi-school', all with template_data.lastVerified set and no yearTemplates key.
- **Verifier reasoning:** I read both key constructions and normalizeOptimization and enumerated the eight fixture keys against the five possible lookup keys; the arithmetic in the finding (8 of 11 dead, business fixture winning the TESU collisions) is exactly right. I then attacked the consequence: I dumped all committed degree_templates inserts and found only three rows, all 'multi-school', so path (b) cannot fire on committed data, and all three carry lastVerified, so the chained lastVerified=now claim is false. What actually results from path (a) on committed data is an empty yearTemplates array, which applyTemplateToPlan rejects with a 'Template Error ... incomplete' toast (usePlanBasket.ts:401-418) — a broken plan rather than a misleading one. I preserved needs_live_data because the collision does become real the moment a TESU row with track_type fastest or balanced exists.

### 32. [HIGH] The 'Credits accepted — max via alt providers: 0 / 120 cr' output is confirmed: acceptedCeiling reads twoPhaseData?.altCredits ?? 0, no fixture has a twoPhaseData key, no committed migration contains 

- **Verdict:** PARTIAL
- **Affects user-facing accuracy:** True
- **Needs live data:** True
- **Settling query:** `SELECT institution_code, track_type, (template_data->>'altCredits') AS alt_credits FROM degree_templates WHERE status='active';`
- **Evidence:** src/pages/Compare/buildCompareRows.ts:67 (picker always passed to scorePool), :76 (acceptedCeiling), :78-79, :87, :147 (tagWinner <= 0 bail); src/lib/planScoring/scorePlan.ts:129-137 (scorePool branch order — creditsBySource wins over the theoretical fit), :70-73 (testing_center/isAltCredit filter); src/pages/Compare/components/CompareTable.tsx:66-73 and :75-90; src/lib/planScoring/config.ts:47 (bestOverall transfer weight 0.3); zero occurrences of twoPhaseData or isAltCredit in src/fixtures/templates/marketplace-v2-templates.json; zero occurrences of altCredits in supabase/migrations/20260217133250_*.sql; src/hooks/useMarketplaceTemplates.ts:228-235 (twoPhaseData only when templateData.altCredits present).
- **Verifier reasoning:** I read buildCompareRows and confirmed the cited lines, then followed scorePool to see which transfer function actually runs. Because buildCompareRows unconditionally passes state.picker, opts.creditsBySource is always defined and getTheoreticalTransferFit is never called from /compare — so the finding's evidence for the 0% is misattributed. Attacking further, I checked whether the picker path could rescue the number and found it cannot: I grepped isAltCredit across src/ and the fixture JSON (zero hits in the fixture) and confirmed every Sophia/Study.com option is providerType 'mooc', which the filter excludes. That makes the concern stronger, not weaker. I kept needs_live_data because production template_data may carry altCredits even though no committed seed does.

### 33. [HIGH] One silent TESU fallback genuinely reaches the screen, and it is not one of the four the finding cites: anchorPolicyAdapter.ts:32-43 maps only tesu/wgu/cosc and resolves every other target_school to T

- **Verdict:** PARTIAL
- **Affects user-facing accuracy:** True
- **Needs live data:** False
- **Evidence:** Confirmed: src/pages/EduTree/v5/utils/anchorPolicyAdapter.ts:32-43 and :69-75; src/pages/EduTree/v5/EduTreeV5Page.tsx:456 (anchorPolicy) and :1001-1015 (the three warnings it drives); src/lib/degree/institutionPolicies.ts:136 (TESU residency 15), :303 (COSC 30), :350,:355 (SNHU 30 residency / 30 upper-div), :396-402 (the 'Do NOT fall back to TESU' comment). Refuting: src/lib/degree/cascade.ts:36-41 (returns, logs), src/pages/EduTree/v5/EduTreeV5Page.tsx:752-755 ('const updatedYears = recomputeYears(); console.log(...)'), src/lib/degree/yearNodes.ts:159 (getPolicyBadges, zero callers), src/state/selectors/degreeNodes.ts:31-39 (the rendered path, policy-correct), src/pages/EduTree/v5/state/usePlanBasket.ts:558-573 (policyIssues go to console.warn + toast only).
- **Verifier reasoning:** I traced each of the four cited tables to a render site. cascade.ts turned out to be dead for display: both call sites discard the return value and the badge helper has no callers, while the rendered year view models come from a different selector that reads the real per-school policy — that part of the finding is refuted outright. deadEndDetector's '|| TESU' only covers an unset anchor, which is a different defect from the one claimed. usePlanBasket's fallback is real but terminates in a toast. Looking for the fallback that actually matters, I found anchorPolicyAdapter, whose three-entry codeMap collapses everything else to TESU and whose output is consumed by the visible degree-summary warnings — so the underlying concern survives, with better evidence and a different victim list (SNHU/UMGC/EXCELSIOR/EMPIRE and draft schools, not COSC).

### 34. [HIGH] Confirmed, and the gate is not even the binding constraint. 2d8da85 touches no migration; VERIFIED_SCHOOL_CODES was trimmed to TESU/COSC/WGU; institution_v1_scope still holds SNHU/ASUO/LIBERTY/UMGC/GC

- **Verdict:** CONFIRMED
- **Affects user-facing accuracy:** True
- **Needs live data:** True
- **Settling query:** `SELECT s.institution_code, s.evidence_coverage_pct, count(r.id) FILTER (WHERE r.is_active) AS active_rules, count(r.evidence_url) AS rules_with_evidence FROM institution_v1_scope s LEFT JOIN credit_transfer_rules r ON r.target_institution = s.institution_code GROUP BY 1,2 ORDER BY 3;`
- **Evidence:** git show --stat 2d8da85 (five files, no migration); src/lib/planScoring/config.ts:37-41; supabase/migrations/20260417171517_4dab1894-62fb-47a3-b704-9678e54b9c73.sql:1-8; src/lib/degree/v1Scope.ts:31-48 (selects institution_code only) and :20 (FALLBACK list TESU/COSC/WGU/EXCELSIOR/EMPIRE); consumers of VERIFIED_SCHOOL_CODES are src/pages/Compare/ComparePage.tsx:43,204,242, src/pages/public/TransferCheckPage.tsx:66,217 and src/hooks/useQuickPlanGeneration.ts:28; rule-target tally from parsing all migrations: WGU 130, COSC 126, EXCELSIOR 105, EMPIRE 73, TESU 39, and 0 for ASUO/GCU/LIBERTY/SNHU/UMGC; ungated admission paths at src/lib/degree/useAvailableInstitutions.ts:192-205 and :207-232.
- **Verifier reasoning:** I ran git show on the commit and read its message and file list — no migration. I read the scope migration and v1Scope.ts line by line and confirmed evidence_coverage_pct is stored and never queried. Rather than trust the quoted rule counts I wrote a parser over every credit_transfer_rules INSERT in all 822 migrations, resolving column order for both VALUES and SELECT forms, and independently reproduced the target distribution — no V2 target appears. I then tried to refute the practical consequence by checking whether something downstream filters the V2 schools out, and found the opposite: two ungated branches in useAvailableInstitutions admit them regardless of the scope table.

### 35. [HIGH] Confirmed, and provable from committed data rather than requiring production access. The query filters only on is_active and target_institution; confidence and last_verified_at are selected at line 63

- **Verdict:** CONFIRMED
- **Affects user-facing accuracy:** True
- **Needs live data:** False
- **Settling query:** `SELECT target_institution, acceptance_status, (target_course_code IS NULL) AS no_target, count(*) FROM credit_transfer_rules WHERE is_active AND target_institution IN ('TESU','COSC','WGU') GROUP BY 1,2,3 ORDER BY 1,2;`
- **Evidence:** src/pages/public/TransferCheckPage.tsx:62-70 (query: only is_active + target_institution), :63 (confidence and last_verified_at selected), :177 (badge), :184 ('→ {r.target_course_code ?? \'accepted\'}'), :185-187 (status as a small parenthetical); grep shows last_verified_at appears only at :37, :63 and in the interface — never rendered; supabase/migrations/20251022184836_bb55f4da-7677-47b8-9028-1dd28ab23b93.sql:156 and 20251022184939_8b2b5f9d-8136-40ca-a96b-adc69d606eb5.sql:156 and 20251022184913_ea4756ef-93d6-45f5-8ffe-096795b63824.sql:96 (the SOPHIA→WGU 'rejected' row); cross-tab of all committed inserts: (accepted,code) 234, (elective,NULL) 193, (elective,code) 6, (rejected,NULL) 3; supabase/migrations/20260120210409_ff5485dc-1337-4250-b764-2eed0972c09a.sql:16-30 and 20260120212218_189432f0-*.sql:9-65 (the view); grep for transfer_rules_with_freshness across src/ returns only src/integrations/supabase/types.ts; route is public at src/app/routes.tsx:273.
- **Verifier reasoning:** I read the whole page including the query and the row renderer and confirmed every cited line verbatim, and grepped to confirm the two fetched provenance fields are never displayed. I then went further than the original finding: I cross-tabulated acceptance_status against target_course_code IS NULL across every committed migration insert, which shows this is not a hypothetical — 196 committed rows already render as '→ accepted', and one of them is a rule explicitly asserting that a Sophia course is rejected at WGU. I looked for a downstream guard (a status filter, a confidence threshold, a freshness join) and found none; the view that would supply verification_kind is queried by no application code. Because the committed data already demonstrates the defect, I set needs_live_data to false; the query now only sharpens the blast radius.

