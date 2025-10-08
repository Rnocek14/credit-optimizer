# ADR 006: Hierarchical Path Taxonomy for True Multipath

**Date:** 2025-10-08  
**Status:** Accepted  
**Context:** Phase 1 of multipath tree implementation

## Decision

Establish stable contracts for path identity, branch semantics, and alternative ranking before implementing the Life Path Bridge.

## Architecture

### Path Lineage Structure

Every visible path in the tree has a **canonical lineage** that uniquely identifies it across catalog versions, deep links, and analytics.

```typescript
export interface PathLineage {
  levels: Array<{ type: PathLevelType; slug: string; label: string }>;
  canonicalSlug: string; // e.g., "bs/cs/se"
}
```

**Example**:
```typescript
{
  levels: [
    { type: 'degree_level', slug: 'bs', label: 'Bachelor of Science' },
    { type: 'major', slug: 'cs', label: 'Computer Science' },
    { type: 'track', slug: 'se', label: 'Software Engineering' }
  ],
  canonicalSlug: 'bs/cs/se'
}
```

### Semantic Rules

#### 1. `equivalentTo` → Overlay/Badge Only
- **Meaning**: Same unit of learning (Calc I at Institution A ≅ Calc I at Institution B)
- **Rendering**: Badge or tooltip on existing node
- **Geometry**: No branching; no additional nodes
- **Example**: "Also accepted: ACE Credit for MTH-101"

#### 2. `alternative` → Branch Geometry
- **Meaning**: Different route/sequence to reach same outcome
- **Rendering**: Checkpoint node → fan-out (max 3 inline)
- **Geometry**: Creates branches when checkpoint is opened/selected
- **Example**: "CLEP Exam vs. Traditional Course Block"

**Critical distinction**: 
- If two items are **both** equivalent and alternative, prefer **overlay** by default.
- Only render as a branch when the user explicitly opens the checkpoint.

#### 3. `creditTransfersTo` → Metadata/Tooltip
- **Meaning**: Credit portability between institutions
- **Rendering**: Overlay by default (no visual edge)
- **Geometry**: Can become a branch **only** if modeled as an alternative route at a checkpoint (e.g., "Finish AA at CC → transfer")
- **Example**: "60 credits transfer → residency warning appears in drawer"

### Branch Selection State Machine

```typescript
export type BranchState =
  | { kind: 'unselected' }                    // Default: all paths visible
  | { kind: 'preview'; checkpointId: string } // Drawer open; dim non-siblings
  | { kind: 'selected'; pathSlug: string };   // User chose a branch; dim others
```

**Rules**:
- State transitions **never** change geometry—only CSS classes (opacity, border, filter)
- No ReactFlow remounts on state changes
- All animations handled via CSS transitions

### Deterministic Ranking Formula

For checkpoints with N > 2 alternatives, use this formula to select the top 2 for inline rendering:

```
score = (w1 * credits_kept) 
      - (w2 * time_weeks) 
      - (w3 * cost_usd) 
      + (w4 * outcome_alignment)
```

**Weights** (frozen in `layoutTokensVertical.ts`):
```typescript
RANKING_WEIGHTS: {
  CREDITS_KEPT: 0.4,       // 40%: maximize credit retention
  TIME_WEEKS: 0.3,         // 30%: minimize duration
  COST_USD: 0.2,           // 20%: minimize cost
  OUTCOME_ALIGNMENT: 0.1,  // 10%: align with career outcomes
}
```

**Tie-breaking**: If scores are equal, sort by `pathSlug` (alphabetical) for determinism.

### Slug Stability Rules

1. **Never derive IDs from labels** (labels can change across catalog versions)
2. **Slugs are immutable** (even if institution renames a program)
3. **Use opaque UUIDs or stable codes** from the source system
4. **Lineage slugs are concatenated** (e.g., `bs/cs/se`) for human readability in URLs

## Consequences

### Benefits
- **Deep links work reliably**: `?selected=bs/cs/se` always resolves to the same path
- **Analytics are stable**: Can track "selected_path" events across sessions
- **Merge detection is generic**: No hardcoded Y3→Y4 logic; works for any tier convergence
- **Ranking is deterministic**: Same two alternatives always appear inline

### Trade-offs
- Slight verbosity in data contracts (explicit lineage on every node)
- Need to maintain slug registry (future: `degree_paths` table)
- Initial catalog import must generate stable slugs (ETL complexity)

## Examples

### Calc I Equivalency (overlay)
```typescript
{
  nodeId: 'block-mth101',
  type: 'requirement',
  title: 'Calculus I',
  data: {
    equivalentTo: [
      { institution: 'CC-Partner', courseCode: 'MATH-121', minGrade: 'C' },
      { source: 'ACE', courseCode: 'MTH-101', recencyYears: 10 }
    ]
  }
}
```
**Rendering**: Badge on the Calc I node; no additional geometry.

### CLEP Exam Alternative (branch)
```typescript
{
  nodeId: 'checkpoint-calc-entry',
  type: 'checkpoint',
  data: {
    alternatives: [
      { 
        pathSlug: 'bs/cs/traditional-calc',
        name: 'Traditional Calculus I',
        credits: 4,
        durationWeeks: 16,
        costUsd: 1200,
        score: 0.75
      },
      { 
        pathSlug: 'bs/cs/clep-calc',
        name: 'CLEP Calculus Exam',
        credits: 4,
        durationWeeks: 1,
        costUsd: 89,
        badges: ['CLEP'],
        score: 0.92
      }
    ]
  }
}
```
**Rendering**: Checkpoint node with 2 inline alternatives (CLEP ranks higher due to time + cost).

### Transfer Credit (metadata)
```typescript
{
  nodeId: 'gate-program-entry',
  type: 'gate',
  data: {
    transferPolicy: {
      maxCredits: 60,
      residencyMin: 30,
      upperDivisionMin: 45
    },
    creditTransfersTo: [
      { institution: 'State-University', maxAccepted: 60, residencyRule: 'last-30' }
    ]
  }
}
```
**Rendering**: Tooltip on gate; drawer shows "Credits Kept / Lost" when alternative selected.

## Validation

### Type Guards (Unit Tests)
```typescript
// src/pages/EduTree/v3/__tests__/types.test.ts
describe('PathLineage', () => {
  it('requires canonicalSlug', () => {
    const lineage: PathLineage = {
      levels: [{ type: 'major', slug: 'cs', label: 'CS' }],
      canonicalSlug: 'bs/cs'
    };
    expect(lineage.canonicalSlug).toBeDefined();
  });
});
```

### Graph Linter (Future)
- Detect `equivalentTo` edges that create cycles
- Warn when `alternative` edges have no ranking metadata
- Ensure all `canonicalSlug` values are unique per tier

## Next Steps (Phase 2)

1. Implement `lifePathBridge.ts` to generate `PathLineage` from `GraphNode.tags`
2. Create `V3CheckpointNode.tsx` and `V3CheckpointDrawer.tsx`
3. Wire `BranchState` into `EduTreeV3Canvas.tsx` with CSS-only filtering
4. Add analytics events: `checkpoint_open`, `branch_select`, `overlay_toggle`

## References

- ADR 005: Vertical Flow Pivot (pure top-to-bottom layout)
- ADR 004: Layout Engine Split (pure functions, no React deps)
- Life Path Graph spec: `src/types/lifePathGraph.ts`
- Checkpoint UX: `docs/specs/edu-tree-multipath-design.md`
