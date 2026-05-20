# Pivot — Launch Plan (Demolition-in-Place)

**Diagnosis:** Not architecture spaghetti. Product-surface spaghetti.
The data asset (verified schools, transfer rules, policy packs, scrapers,
Supabase tables, equivalency logic, compare → preview flow) is clean.
The liability is too many surfaces visible to logged-out strangers.

**Strategy:** Keep the engine. Hide the noise. No rebuild, no remix.

---

## Public allowlist (the only routes a stranger sees)

```
/                       Landing
/get-started            Credits funnel entry
/compare                5-school comparison
/plan/preview/:id       Plan closer
/guides, /guides/:slug  SEO entries
/auth                   Magic-link sign-in
```

Plus intentional per-resource share routes (kept public):
`/resume/:userId`, `/embed/:resumeId`, `/share/trust/:token`, `/verify/:code?`.

**Everything else requires auth.** Hubs, EduTree v5/v6, marketplace,
career explore, all admin tools, all stakeholder hubs, sandbox, embed-generator,
analytics dashboards, gallery surfaces — all gated.

---

## Day 1 — Lock the surface  ✅ DONE

- [x] Landing CTA → `/get-started` (was `/auth`)
- [x] Hide `MobileNavigation` for logged-out users
- [x] Public allowlist enforced — wrapped ~25 leaky routes with `ProtectedRoute`
- [x] `/sandbox/track-overlay` mounted only in DEV

## Day 2 — Plan save + email capture

- [ ] `lead_captures` table (email, plan_template_id, picker_state, attribution, source)
- [ ] `SavePlanCTA` component on `/plan/preview/:id`
- [ ] Supabase magic-link auth flow (`signInWithOtp`)
- [ ] Trust line ("Sourced from official catalogs. Last verified <date>.")
- [ ] Analytics: `plan_preview_viewed`, `email_captured`

## Day 3 — SEO + distribution prep

- [ ] Polish 3 highest-intent guides (titles, meta, JSON-LD, canonical)
- [ ] Sitemap reflects allowlist only (no admin/hub leaks)
- [ ] `robots.txt` disallows `/admin*`, `/edu-tree*`, `/contribute*`, `/sandbox/*`

## After first launch verifies the funnel

- [ ] Quarantine non-funnel pages to `src/_archive/2026-05-pre-launch/`
- [ ] Disable unused edge functions
- [ ] Add "Mix schools" v2 surface on `/plan/preview/:id`

---

## Success criteria for "launched"

- 100 `get_started_started`
- 30 `plan_preview_viewed`
- 10 `email_captured`
- 3 unsolicited replies
