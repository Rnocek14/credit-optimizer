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

5. **Most pack non-promotion is unobservable in the database.** Of 32 non-deprecated packs, 19 (59%) have neither `promoted_at` nor `blocked_reason`. The gate-rejection narrative ("Gate 5 rejects most drafts for missing ground truth") is partially wrong: most non-promotions are not gate rejections — they are abandoned drafts that nothing ever attempted to promote.

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
5. **Restart cron.** Wait one cycle (one week).
6. **Re-baseline.** Compare against v1. If UMGC still has scrapes and zero packs, escalate to a merge-pipeline investigation.
7. **Only after a clean cycle:** revisit the UMPI-onboarding question with real data.

UMPI is not on this list by design. The question moves from "can we" to "should we re-ask the question" only after step 6.

---

## What this addendum does and does not do

- **Does:** establish the verdict revision as a committed record. Names the meta-lesson about phantom files. Records the diagnostic findings that drove the change. Replaces the original next-actions with a sequenced order.
- **Does not:** edit a `PIVOT_SCRAPER_AUDIT.md` file (none exists in the repo). Edit existing repo content. Encode interpretations of numbers that may shift after the next cron cycle (those belong in panel captions, which are easier to update than a baseline file).

Related artifacts:
- `docs/pipeline-health/BASELINE_2026-05-21_v0_DO_NOT_USE.md` — superseded baseline retained as evidence of the value-verification gap.
- `docs/pipeline-health/BASELINE_2026-05-21_v1.md` — current baseline with postmortem header.
- `supabase/migrations/20260521131902_*.sql` — six pipeline-health views.
- `supabase/migrations/20260521_133919_*.sql` and `20260521_134003_*.sql` — status-filter fix + helper EXECUTE grant.
