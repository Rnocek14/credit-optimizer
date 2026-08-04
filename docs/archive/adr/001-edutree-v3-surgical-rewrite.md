# ADR 001: EduTree V3 Surgical Rewrite

**Status:** Accepted  
**Date:** 2025-10-06  
**Context:** EduTreeV3 namespace isolation and progressive disclosure architecture

## Decision

Build EduTree V3 in a new namespace (`/edu-tree-v3` route) with a complete rewrite of the layout engine and data enrichment layers, while preserving working ReactFlow integration and UI components. Keep V2 frozen as an escape hatch.

## Problem Statement

EduTree V2 has critical technical debt:
- **1,676-line monolithic renderer** (`manualLayoutRenderer.ts`) mixing layout logic, data enrichment, and UI concerns
- **Inconsistent node height handling** causing collision detection failures
- **Chaotic ID fallbacks** (`block?.block?.id`) creating data flow bugs
- **No progressive disclosure** - all 100+ nodes render upfront, overwhelming users
- **Modal-based interactions** causing ReactFlow instance remounts

## Architecture Principles

### 1. Progressive Disclosure First
**Default view shows ≤15 nodes** (Year cards + collapsed track bundles)  
**User-driven expansion** (click Year 3 → SE/DS tracks expand)  
**CSS-only visual states** (no remounting, instant <75ms transitions)

### 2. Region-Aware Layout
**Program regions** (CS upper, IT lower) never cross  
**Track corridors** (SE left fork, DS right fork) with `TRACK_COLUMN_OFFSET`  
**Collision resolver** respects region boundaries (`REGION_GUTTER`, `TRACK_GUTTER`)

### 3. Pure Function Core
```typescript
// All layout functions are pure, testable, no side effects
layoutEngine.calculateLayout(graph, tokens) -> Map<id, Position>
regionManager.computeRegions(nodes, tokens) -> Map<id, Region>
collisionResolver.resolve(nodes, regions, tokens) -> Node[]
```

### 4. Docked Panel > Modals
**Single docked panel** (right side, 400px) with tabs: Overview | Courses | Eligibility | Cost | Outcomes  
**No ReactFlow remount** on panel open/close  
**Keyboard accessible** (Tab/Enter/Esc navigation)

## Constraints

### Type Safety (Non-Negotiable)
```typescript
// tsconfig.json
{
  "exactOptionalPropertyTypes": true,
  "noUncheckedIndexedAccess": true,
  "strict": true
}

// types/v3.ts - Single source of truth
interface V3Node {
  id: string;              // Required, no fallbacks
  type: NodeType;          // 'year' | 'track-bundle' | 'requirement' | 'gate'
  data: V3NodeData;        // Strongly typed per node type
  position: Position;      // Set by layout engine
}
```

### Layout Tokens (Immutable)
```typescript
// layoutTokensV3.ts - Lock these, reference everywhere
export const LAYOUT_TOKENS = {
  NODE_WIDTH: 180,
  NODE_BASE_HEIGHT: 120,
  NODE_MAX_HEIGHT: 250,      // For collision safety
  LANE_GAP: 60,
  YEAR_COL: { Y1: 300, Y2: 700, Y3: 1100, Y4: 1500 },
  TRACK_COLUMN_OFFSET: 56,   // SE left, DS right at fork
  COL_TOLERANCE: 48,
  REGION_GUTTER: 24,
  TRACK_GUTTER: 16,
  GRID: 8                    // Snap unit
} as const;
```

### Performance Budgets
- **Initial render:** <600ms for ~100 nodes
- **Panel open:** <120ms
- **Selection/expansion:** <75ms
- **Collision resolution:** <50ms for 200 nodes

## Consequences

### Benefits
✅ **Clean separation of concerns** (layout ≠ enrichment ≠ UI)  
✅ **Zero layout bugs** (deterministic collision resolver)  
✅ **Progressive UX** (15 nodes → expand on demand)  
✅ **Testable** (pure functions, unit tests for all engines)  
✅ **Future-proof** (career nodes, milestones = trivial extensions)  
✅ **Code reduction** (1,676 lines → ~400 lines core engine)

### Risks & Mitigations
| Risk | Mitigation |
|------|-----------|
| Breaking V2 features | Keep V2 frozen, feature flag V3 |
| Layout looks different | Port exact collision logic, validate visually |
| Performance regression | Profile before/after, enforce budgets in CI |
| Hidden coupling | New namespace + strict types + ADRs |
| Accessibility gaps | A11y from day 1, axe-core in CI |

## Implementation Strategy

See [002-edutree-v3-technical-spec.md](./002-edutree-v3-technical-spec.md) for detailed file structure, data flow, and testing strategy.

## Alternatives Considered

1. **Full rewrite from scratch:** Rejected - throws away working ReactFlow integration
2. **Incremental refactor of V2:** Rejected - technical debt too deep, will recreate same bugs
3. **Keep V2, build V3 features on top:** Rejected - progressive disclosure impossible with current architecture

## Decision Drivers

- **User feedback:** "Too overwhelming, can't see the path"
- **Bug severity:** Collision detection failures block core UX
- **Maintainability:** New features (career nodes) impossible without clean foundation
- **Team velocity:** Current bugs take 3x longer to fix due to tangled code
