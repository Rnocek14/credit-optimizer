## California ASSIST Ingestion Pipeline — Build Plan

Goal: ingest the California articulation system (116 CCs → 23 CSU + 10 UC) into a provenance-first transfer graph, then use it to power a "Cheapest Path" answer engine. No other states until this works end-to-end.

---

### Phase 1 — Provenance-first schema (Day 1)

One migration. Extends what we have instead of forking it.

**Extend `credit_transfer_rules` (the "current verified snapshot" row):**
- `source_url TEXT` — exact ASSIST agreement URL
- `source_type TEXT` — `'state_articulation' | 'registrar' | 'ace' | 'clep' | 'ai_inferred' | 'legacy'`
- `source_date DATE` — when ASSIST published it
- `last_verified_at TIMESTAMPTZ`
- `verification_status TEXT` — `'verified' | 'inferred' | 'stale' | 'rejected'`
- `provenance_system TEXT` — `'ASSIST' | 'TCCNS' | 'FLVC' | ...`
- `articulation_agreement_id UUID` — links to the parent agreement
- Backfill existing rows to `source_type='legacy'`, `verification_status='inferred'`

**New table `articulation_agreements`:**
- `id`, `from_institution_code`, `to_institution_code`, `academic_year`, `major_code`, `agreement_type` (`'course-to-course' | 'major-prep' | 'igetc' | 'csu-ge'`), `source_url`, `source_system`, `effective_date`, `expires_date`, `pdf_snapshot_url`, `raw_html`, `fetched_at`

**Use existing `transfer_evidence` for the immutable history trail** — every time the ASSIST scraper re-confirms or changes a rule, insert a new evidence row pointing at the same `credit_transfer_rule_id`. Rule row = latest snapshot; evidence table = full audit log. (Matches your "Both" choice.)

**New table `assist_ingestion_runs`:** run_id, started_at, completed_at, agreements_discovered, agreements_parsed, rules_inserted, rules_superseded, errors, status.

All tables get GRANTs + RLS (public read on agreements + rules, admin-only writes via `public.is_admin()`).

---

### Phase 2 — ASSIST ingestion worker (Days 2–6)

Three edge functions, all gated by `x-cron-secret` (matches our ops auth standard):

1. **`assist-discover`** — hits `assist.org`'s public agreement index, enumerates `(from_inst, to_inst, major, year)` triples for the current academic year. Writes one `articulation_agreements` row per triple in `status='pending'`.

2. **`assist-fetch`** — workers pull pending agreements, scrape via Firecrawl (we already have `firecrawl-scrape`), store raw HTML + `pdf_snapshot_url` for audit, mark `status='fetched'`.

3. **`assist-parse`** — parses each fetched agreement into structured `credit_transfer_rules` rows. ASSIST has a fairly regular DOM (course block → "satisfies" → target course block), so this is deterministic parsing + a Gemini fallback for irregular rows. Every rule written gets full provenance fields. Every change writes a `transfer_evidence` row.

Cron: nightly discover, hourly fetch/parse with a small batch size. Start with a single (from→to) pair to validate end-to-end before opening the floodgates.

---

### Phase 3 — Admin coverage dashboard (Day 7)

New page `/admin/articulation-coverage`:
- Heatmap: rows = CCs, cols = CSU/UC, cell = # of verified agreements / # of majors covered
- Per-agreement drill-in: parsed rules vs raw HTML side-by-side, "approve / reject / re-parse" buttons
- Recent ingestion runs + error log
- Source-type breakdown of `credit_transfer_rules` (legacy vs state_articulation vs ai_inferred)

This is the only thing you actually have to look at weekly.

---

### Phase 4 — Wire into the existing resolver (Days 8–9)

The existing resolution engine v3 already prefers verified over inferred. We just:
- Bump ordering so `source_type='state_articulation' + verification_status='verified'` is the highest tier
- Show source badge in the marketplace ("Verified via ASSIST · updated 2026-05-12 · view agreement →")
- Filter the marketplace by "California transfer-ready" when a CA CC is in the user's transcript

---

### Phase 5 — Cheapest Path query (Days 10–14)

Given `{current_credits, target_major, target_institution}`:
1. Pull verified `credit_transfer_rules` for the target
2. Subtract what the user already has (via existing transcript / completed-courses)
3. For each missing requirement, find the cheapest CA CC course that articulates (cost from existing pricing packs)
4. Return: missing courses, recommended CC offerings, total $ + estimated months, full provenance trail per recommendation

Surfaces on `/compare` as a new "California pathway" result card. No new top-level route.

---

### What I am explicitly NOT building
- Multi-state framework (FLVC/TCCNS adapters wait for after CA is live)
- Scraping GradFaster/Transferology/CollegeSource (legal blacklist already memorialized)
- New SaaS tier, employer B2B, FOIA generator — all post-CA

---

### Technical notes (for the record)
- Uses existing `firecrawl-scrape` edge function
- Uses existing `transfer_evidence` provenance pattern
- Uses existing `public.is_admin()` RLS standard
- Uses existing ops-cron `x-cron-secret` standard
- No new packages, no new connectors

---

### What I need from you to start
- Just say **"go"** and I'll open the Phase 1 migration first (schema + grants + RLS), then build the three edge functions.
- If you want to scope down further (e.g. "start with one CC → SJSU pair as proof"), say so and I'll narrow Phase 2 accordingly.
