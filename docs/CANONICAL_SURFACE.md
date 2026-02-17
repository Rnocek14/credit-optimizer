# Canonical Surface Map

> Single source of truth for routed surfaces. Do NOT add new top-level routes.
> All new features go inside existing hub tabs. See `README_NAV.md` for details.

## Canonical Hubs

| Hub | Path | Default Tab | Intent |
|---|---|---|---|
| Discover | `/discover` | `careers` | Explore careers, courses, mentors, market intel |
| Plan | `/plan` | `roadmap` | Strategic planning, goals, workflows, proof |
| Progress | `/progress` | `history` | Track history, portfolio, credentials, resume |
| Today | `/today` | — | Daily focus dashboard (Next Step, Streaks) |
| Contribute | `/contribute` | `teach` | Teach, institution, employer, admin (gated) |

## Canonical Feature URLs

| Feature | Path | Notes |
|---|---|---|
| EduTree V5 | `/edu-tree-v5` | Only canonical version; V1–V4 redirect here |
| Marketplace | `/edu-tree-v5/marketplace` | Primary marketplace entry |
| Standalone Marketplace | `/marketplace` | Alternate entry (DegreeMarketplace) |
| Build (track builder) | `/build` | Protected |
| Career list | `/explore/careers` | Under Discover hub |
| Career detail | `/explore/careers/:id` | Under Discover hub |

## Public / Embed URLs (no auth)

| Path | Purpose |
|---|---|
| `/resume/:userId` | Public resume view |
| `/embed/:userId` | Embeddable resume widget |
| `/verify/:signatureId` | Certificate signature verification |

## Redirect-Only Legacy URLs

These routes exist **only as redirects** — no component renders at these paths.
Do NOT re-introduce components on these routes.

```
/dashboard         → /plan
/explore           → /discover?tab=career
/explore-hub       → /discover
/plan-hub          → /plan
/planner           → /plan?tab=roadmap
/goals             → /plan?tab=goals
/workflows         → /plan?tab=workflows
/history           → /progress?tab=history
/learning-history  → /progress?tab=history
/course-history    → /progress?tab=history
/badges            → /progress?tab=achievements
/certificates      → /progress?tab=achievements
/wallet            → /progress?tab=achievements
/resume-builder    → /progress?tab=resume
/resume-analytics  → /progress?tab=resume
/projects          → /progress?tab=portfolio
/teach-hub         → /contribute?tab=teach
/institution-hub   → /contribute?tab=institution
/employer-hub      → /contribute?tab=employer
/edu-tree          → /edu-tree-v5
/edu-tree-v2..v4   → /edu-tree-v5
```
