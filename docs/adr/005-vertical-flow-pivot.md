# ADR 005: Pivot to Pure Vertical Flow for EduTree V3

## Status
**Accepted** (2025-01-XX)

Supersedes the horizontal year-column approach from ADR 004 for collapsed view.

## Context

After 100+ hours of development on a hybrid horizontal/vertical layout (year columns + gate gutters), we encountered persistent issues:

1. **Visual confusion**: Diagonal edges, unclear spine, Y3 split appearing flat
2. **Code complexity**: ~400 lines across 4 files (layout engine, collision resolver, clamp, tokens) with fragile token interdependencies
3. **Maintenance burden**: Every adjustment required rebalancing multiple constants (year widths, lane offsets, gate positions, collision thresholds)
4. **UX mismatch**: Horizontal progression conflicts with mental model of time-based journey (users expect top→bottom flow)

Key problems with hybrid approach:
- Gates "floated" in gutters (not visually inline with spine)
- Y3 fork required complex handle switching (east/west for spine, north/south for gates)
- Two layout passes needed (initial + clamp)
- Non-deterministic edge cases (race conditions in collision resolution)

## Decision

**Adopt a pure vertical flow** with all nodes connecting top-to-bottom:

```
Y1
 ↓
Program Gate (decision: Y1 → Y2)
 ↓
Y2
 ↓
Track Gate (decision: Y2 → Y3)
 ↓   ↓
SE  DS  (side-by-side, same Y row)
 ↓   ↓
  Y4  (merge)
```

### Architecture

**New components:**
- `layoutEngineVertical.ts`: Pure function, single pass, ~50 lines
- `layoutTokensVertical.ts`: Minimal tokens (CENTER_X, VERTICAL_GAP, H_SPACING)
- `edgeMapperVertical.ts`: Uniform smoothstep edges, all top/bottom
- `CompareMiniCards.tsx`: Inline SE vs DS comparison under Track Gate
- `TrackCompareDrawer.tsx`: Detailed side panel for comparison

**Key principles:**
1. **Deterministic**: Same input always produces same output
2. **Single pass**: No collision resolution or clamp needed
3. **Grid-aligned**: All positions snap to 8px grid
4. **Handle uniformity**: All nodes use sourcePosition='bottom', targetPosition='top'
5. **Comparison as overlay**: Mini cards + drawer, not layout concern

### Comparison UI Strategy

Instead of relying on layout to show SE/DS side-by-side, we use:
- **Mini cards** render under Track Gate when focused (quick glance)
- **Side drawer** opens for detailed comparison (course lists, outcomes, deltas)
- **Y3 bundles** still appear side-by-side in layout for visual clarity

This separates concerns: layout handles positioning, UI overlays handle comparison.

## Consequences

### Positive

✅ **Clarity**: Matches mental model (life path journey is top-to-bottom)  
✅ **Simplicity**: ~70% reduction in layout code (50 lines vs 200+)  
✅ **Maintainability**: Single token set, one layout function, no edge cases  
✅ **Determinism**: No race conditions, same output every time  
✅ **Testability**: Clear invariants (monotonic Y, grid snap, no overlaps)  
✅ **Future-proof**: Easy to add branches (programs, micro-credentials) as vertical extensions  
✅ **Comparison UX**: Dedicated UI for SE/DS comparison (better than layout alone)

### Negative

⚠️ **Canvas height**: Vertical stacking increases scroll distance  
  *Mitigation*: Minimap, sticky year markers, smooth scroll to year  

⚠️ **Change management**: Users/stakeholders accustomed to horizontal view  
  *Mitigation*: Feature flag, keep horizontal as "Legacy Compare View" during transition  

⚠️ **Mobile viewport**: Tall canvas may feel cramped on phones  
  *Mitigation*: Collapsed bundles minimize height; expand on demand  

### Migration Plan

1. **Week 1**: Ship vertical behind feature flag (`?layout=vertical`)
2. **Week 2**: Gather feedback, iterate on comparison UI
3. **Week 3**: Make vertical default, keep horizontal as opt-in fallback
4. **Week 4**: Deprecate horizontal if no critical issues

## Alternatives Considered

### 1. Pure Horizontal Flow
**Pros**: Wide canvas matches timeline metaphor (left→right = past→future)  
**Cons**: Gates still awkward (top/bottom junctions in horizontal flow); Y3 merge is confusing (two inputs from same X)  
**Verdict**: Rejected; doesn't solve core gate/merge issues

### 2. Hybrid with Better Tokens
**Pros**: Incremental improvement, less disruption  
**Cons**: Still fighting diagonal edges, clamp pass, handle conditionals; technical debt persists  
**Verdict**: Rejected; bandaid solution, doesn't address root cause

### 3. Dagre/Elkjs Auto-Layout
**Pros**: Delegate complexity to library  
**Cons**: Non-deterministic, hard to debug, doesn't guarantee clear spine; loses design control  
**Verdict**: Rejected; we need explicit control for educational clarity

## Notes

- Gate semantics: `gate.year` = **destination year** (e.g., Program Gate year=2 means Y1→Y2)
- Expanded view (future): May use different layout (e.g., course stacking within years); vertical spine still applies
- Comparison data: Store in `V3NodeData.compareData` for Track Gate; populate from seed data or API

## References

- ADR 004: Layout Engine Split (horizontal approach)
- `cypress/e2e/vertical-flow.cy.ts`: Acceptance tests
- `src/pages/EduTree/v3/engine/__tests__/layoutVertical.test.ts`: Unit tests
- GPT analysis: "Comprehensive Visual and Code Analysis" (2025-01-XX)
