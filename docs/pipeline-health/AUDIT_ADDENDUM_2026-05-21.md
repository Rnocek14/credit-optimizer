# Audit Addendum — 2026-05-21

Addendum to the May 2026 scraper-pipeline audit conducted in conversation. The original audit was not committed to the repo as an artifact; it exists only as chat history. This addendum is the first committed record of the audit's conclusions, and revises them.

---

## Meta-lesson (read first): generated-output vs committed-artifact confusion

During the original audit, the auditor produced a markdown report via tooling and shared it as a deliverable. In continued conversation, the auditor later referenced that file as if it lived in the repo and proposed edits to it. The file did not exist in the repo — `find` and `rg` returned no matches under any plausible name.

**The lesson:** an LLM's output to a chat tool is not a repo artifact. Treating it as one creates phantom files that are not grep-able by anyone else, not accountable in version control, and not visible to future readers or reviewers. Future audits should explicitly state whether deliverables are intended to land in the repo, and if so, the user should confirm the commit before later work references them as durable references.

This generalizes past audits: any time a prior LLM session's output is treated as part of the shared record, the same confusion is possible. Verify file existence (`find`, `rg`) before asserting file content. The cost of that check is one shell command. The cost of skipping it is debate over a document that one party can see and the other cannot.

This is also the same class of error the addendum below corrects in the diagnostic work: asserting something about a system's state without empirical verification. The original audit asserted the pipeline ran (no DB query); the follow-up referenced a file that wasn't there (no `find`). Same pattern, different surface.

---

## Verdict revision: YELLOW → RED

The conversational audit's verdict was YELLOW, on the premise that the pipeline ran and only needed new schools fed in. The premise was unverified at the time of the verdict; nothing in the codebase contradicted it, and nothing in the codebase confirmed it either. The audit treated absence of evidence as evidence of absence-of-problems.

Twenty-four hours of live database diagnostics surfaced the following, and the verdict moves to **RED**:

1. **Cron is dead for both cohorts.** Original-5 (COSC, EMPIRE, TESU, WGU; EXCELSIOR never scraped) last scraped Jan 9–13 2026. V2-expansion-5 (ASUO, GCU, LIBERTY, SNHU, UMGC) last scraped Apr 17–21 2026. Zero successful scrapes for any institution in the last 7 days. The pipeline ran once, four months ago for the original cohort and one month ago for the V2 cohort, and has been silent since. (Provenance note on EXCELSIOR: verified 2026-05-21 via `SELECT count(*) FROM scrape_jobs WHERE institution = 'EXCELSIOR'` → 0. Its ~170 transfer rules were ingested via external paths — Study.com partner pages (69), CLEP/CollegeBoard registries (45), ACE Credit (56) — none of which touch `scrape_jobs`. EXCELSIOR is "never scraped" in the strict pipeline sense, not "no transfer data".)

2. **Template-column stamping is broken.** `scrape_url_templates.last_scraped_at` is `NULL` for every active template across all 10 institutions, despite job-level success records. The write at `transfer-scraper-auto-scan/index.ts:283` either never executes or writes to the wrong column. Known patch site, not yet applied.

3. **The validate writer went silent in February.** January packs came predominantly via the `validate` (alt-credit) path. April packs are entirely `merge`-driven, zero validate. No code change in the repo explains the divergence. Parked for post-panel investigation.

4. **The v1_scope set includes institutions producing no usable artifacts.** UMGC has 145 successful scrapes across both months and 0 packs total — a clean merge-side failure independent of scrape quality. ASUO, GCU show similar 0% promotion rates against small denominators.

5. **Pack non-promotion is largely unobservable in the database, against a small denominator.** Of 32 non-deprecated packs, 19 (59%) have neither `promoted_at` nor `blocked_reason`. Three of those 19 trace to a January 2026 bulk-SQL backfill that bypassed `promote-policy-pack` entirely; the remaining 16 are likely abandoned drafts. Generalizable claim: the `promote-policy-pack` invocation rate is not currently logged anywhere queryable, so we cannot distinguish "promotion attempted and gate-rejected" from "promotion never attempted." Whether this matters depends on how often promotion is the bottleneck vs. drafts simply not being submitted. The earlier "Gate 5 rejects most drafts" narrative overstated the scope.

**Implication for UMPI onboarding:** the audit's original "can we add UMPI in a day" question is RED-blocked until the pipeline can be shown to function for the existing five institutions. Adding UMPI to a non-functioning pipeline adds a sixth instance of a process that does not currently produce reliable output. The architecture is reusable; the operation is not. Those are different claims and the audit conflated them.

---

## Pass-4 lesson: live operational state

The original audit had three passes — pipeline map (static analysis), row counts (marked UNKNOWN, requires DB access), and verdict. Pass 2's "UNKNOWN" was honest but ducked the question it raised: without operational data, Pass 3's verdict was guessing.

**Future audits of pipeline-style systems should have a Pass 4: live operational state.** Even one query —

```sql
SELECT institution, max(created_at), count(*)
FROM <output_table>
GROUP BY institution;
```

— would have surfaced "cron dead since January" in the first hour and reframed the entire audit. The cost is one DB query. The cost of skipping it was three weeks of YELLOW-verdict implications and an audit conclusion that did not survive the first real diagnostic.

The principle generalizes: **static code analysis on a pipeline verifies that the pipeline can-in-principle run. It cannot verify that the pipeline does-in-fact run.** The latter requires telemetry, monitoring, or a live query. An audit without at least one of those is incomplete by construction, regardless of how thorough the static analysis is.

---

## Revised next actions

The original audit's "next 3 actions" are replaced by a single sequenced one. No parallel work, no shortcuts:

1. **Ship observability.** Done — six pipeline-health views, baseline v1 captured, status-filter bug fixed and helper function in place.
2. **Build the admin panel on top of the views.** Tomorrow. Headline-cohort-split layout, per-section source-table captions, `pack_promotion_ratio` (lifetime) + `pack_promotion_ratio_live` (non-deprecated population) shown side by side.
3. **Sit with the panel for 24 hours before patching anything.** The panel exists to make patches visible against history. Patching the same day defeats that.
4. **Patch `transfer-scraper-auto-scan/index.ts:283`.** Manual invoke against TESU. Watch Q1, Q1b, Q2 for the four expected deltas. If Q1b stays null, line 283 is the wrong site and the patch is rolled back.
5. **Restart cron — staged.** Restart for one cohort first (TESU, since most data and most signal). Watch the panel for 24h. If Q1/Q1b/Q2 move as expected and nothing surprises, restart for the other nine. Do not restart all ten at once: if there's a fourth bug we haven't found, surface it in one institution, not ten. Same decoupled-change/deltable-signal pattern as steps 3 and 4.
6. **Re-baseline.** Compare against v1. If UMGC still has scrapes and zero packs, escalate to a merge-pipeline investigation.
7. **Only after a clean cycle:** revisit the UMPI-onboarding question with real data. "Real data" is concretely defined as: (a) Q1 shows successful scrapes within the last 7 days for at least 8 of 10 institutions, (b) Q1b shows non-null `last_scraped_at` template stamps for the same 8, and (c) `pack_promotion_ratio_live` is above 50% for at least 3 institutions. Failing any one of these three is a re-block, not a partial win.

UMPI is not on this list by design. The question moves from "can we" to "should we re-ask the question" only after step 6.

---

## What this addendum does and does not do

- **Does:** establish the verdict revision as a committed record. Names the meta-lesson about phantom files. Records the diagnostic findings that drove the change. Replaces the original next-actions with a sequenced order.
- **Does not:** edit a `PIVOT_SCRAPER_AUDIT.md` file (none exists in the repo). Edit existing repo content. Encode interpretations of numbers that may shift after the next cron cycle (those belong in panel captions, which are easier to update than a baseline file).

Related artifacts:
- `docs/pipeline-health/AUDIT_ADDENDUM_2026-05-21.md` — this document. Self-referential, listed so a reader landing here from search confirms they are in the canonical location.
- `docs/pipeline-health/BASELINE_2026-05-21_v0_DO_NOT_USE.md` — superseded baseline retained as evidence of the value-verification gap.
- `docs/pipeline-health/BASELINE_2026-05-21_v1.md` — current baseline with postmortem header.
- `supabase/migrations/20260521131902_*.sql` — six pipeline-health views.
- `supabase/migrations/20260521_133919_*.sql` and `20260521_134003_*.sql` — status-filter fix + helper EXECUTE grant.

---

## Appendix A: Original conversational audit (Reconstruction, not original)

**Status:** Reconstruction from chat history, not a verbatim paste. The original audit was rendered to a chat tool and never committed; the file the user later referenced (`PIVOT_SCRAPER_AUDIT.md`) did not exist in any repo `find`/`rg` could see, and the paste promised in subsequent messages never arrived. This appendix exists so the addendum is self-contained; it should not be cited as evidence of what the original chat output literally said.

**TL;DR (reconstructed):** Pivot's scraper pipeline is architecturally sound across 5 stages (crawl → extract → merge → validate → promote), with 10 active institutions seeded. Verdict YELLOW: add UMPI next, watch for merge-side failures.

**Pass 1 — Pipeline map (reconstructed):** Static analysis of `supabase/functions/transfer-scraper-*` plus `policy-refresh-start` and `promote-policy-pack`. Identified the 5-stage flow, the `scrape_url_templates` driver table, and the `institution_policy_packs` output table. No code-level red flags found.

**Pass 2 — Row counts (reconstructed):** Marked UNKNOWN. The auditor noted they did not have DB access during the session and would need a follow-up query pass. This pass was never performed in the original audit; it became the addendum's Pass 4.

**Pass 3 — Verdict YELLOW (reconstructed):** Recommendation to onboard UMPI next, on the assumption the pipeline was operational. The verdict-revision section above (RED) supersedes this, on the empirical grounds that the pipeline has not produced new output for 4 months for the original cohort and 1 month for V2.

**Pass 3 also surfaced three side-recommendations** that did not make it into the addendum's revised next-actions and are noted here for the panel-then-pause phase to consider:
- Add a write-quality SLO to `promote-policy-pack` (e.g., reject packs with confidence < 0.7).
- Build per-institution rate limiting into `transfer-scraper-crawl` to avoid hostile-domain throttling.
- Consider moving `validate` from synchronous-in-merge to its own queue.

None of these are blocking; they belong post-Phase 7.

