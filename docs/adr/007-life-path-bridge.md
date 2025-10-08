# ADR 007: Life Path Bridge - Graph Ingestion & Mapping

**Status**: Accepted  
**Date**: 2025-01-08  
**Phase**: Phase 2 (Bridge Implementation)

## Context

The EduTree V3 system needs to consume Life Path Graph data (comprehensive CS/Nursing/Engineering degree paths with alternatives, credit transfers, and articulation agreements) while maintaining visual stability during the bridge implementation.

Phase 2 focuses on **zero visual changes** - we ingest and map the graph but don't render alternatives yet. This validates our bridge architecture before adding checkpoint UX in Phase 3.

## Decision

### 1. Bridge Module Architecture

Create `lifePathBridge.ts` to transform Life Path Graph format to V3 format:

```typescript
export function lifePathToV3(
  graph: { nodes: GraphNode[]; edges: GraphEdge[] },
  opts: BridgeOptions
): { nodes: V3Node[]; edges: V3Edge[]; meta: BridgeMeta }
```

**Key Mappings**:
- `GraphNode.attributes.depth` → `V3NodeData.tier` (canonical source of hierarchy)
- `GraphNode.tags` → `canonicalSlug` generation (stable path identity)
- `GraphEdge.type === 'alternative'` → counted in `meta.forksDetected` (not rendered yet)

### 2. Node Type Mapping

Phase 2 uses conservative mapping to keep visuals identical:

| Life Path Type | V3 Type | Rationale |
|----------------|---------|-----------|
| `skill`, `course`, `certification`, `credential`, `creditBlock` | `track-bundle` | Render as collapsible bundles |
| `job`, `jobGoal` | `gate` | Decision points |

Phase 3 will introduce `checkpoint` nodes where `meta.alternativesByNode[nodeId] >= 2`.

### 3. Edge Type Mapping

| Life Path Edge | V3 Edge Kind | Usage |
|----------------|--------------|-------|
| `requires` | `prereq` | Hard prerequisite |
| `stacksInto`, `buildsSkill` | `spine` | Progression path |
| `qualifiesFor` | `gate` | Junction edge |
| `equivalentTo` | `alternative` | Counted, not rendered (Phase 2) |
| `creditTransfersTo` | `advisory` | Transfer metadata |
| `alternative` | *(filtered)* | Counted in `meta.forksDetected` |

### 4. Bridge Metadata Structure

```typescript
interface BridgeMeta {
  forksDetected: number;                    // Count of alternative edges
  tiers: number;                            // Max depth + 1
  slugsUsed: string[];                      // Canonical path slugs
  alternativesByNode: Record<string, number>; // Per-node fork count
}
```

**Usage**:
- `forksDetected >= 1` proves data richness (validates alternatives exist)
- `alternativesByNode` guides Phase 3 checkpoint placement
- `slugsUsed` enables deep linking (Phase 4)

### 5. Canonical Slug Generation

**Strategy**:
1. Check for `slug:` prefixed tags in `GraphNode.tags`
2. Extract slug: `node.tags.find(t => t.startsWith('slug:'))?.replace('slug:', '')`
3. Fallback to `node.id` if no slug tag exists

**Example**:
```typescript
// Input: node.tags = ['programming', 'slug:bs-cs-se', 'foundational']
// Output: canonicalSlug = 'bs-cs-se'
```

Slugs power stable path identity across phases and enable analytics tracking.

### 6. Feature Flag Integration

**URL Flag**: `?source=lifepath`
- Activates Life Path Graph ingestion
- Falls back to seed data if flag absent
- Backward compatible (seed data remains default)

**Implementation**:
```typescript
const params = new URLSearchParams(window.location.search);
const useLifePathSource = params.get('source') === 'lifepath';

const bridgedData = useMemo(() => {
  if (!useLifePathSource || !lifePathGraph?.graph?.nodes) return null;
  return lifePathToV3(lifePathGraph.graph, { showAlternatives: false });
}, [useLifePathSource, lifePathGraph?.graph]);
```

### 7. Dev Instrumentation

Extend `__dumpV3()` to include bridge metadata:

```typescript
(window as any).__dumpV3 = () => ({
  nodes: finalGraph.nodes,
  edges: finalGraph.edges,
  tokens: useVerticalLayout ? VERT : LAYOUT_TOKENS,
  layout: useVerticalLayout ? 'vertical' : 'horizontal',
  instanceId: instanceIdRef.current,
  branchState: { kind: 'unselected' },
  meta: sourceMeta, // ← Phase 2: bridge metadata
});
```

**Cypress Access**:
```typescript
cy.window().then(win => {
  const dump = (win as any).__dumpV3?.();
  expect(dump.meta.forksDetected).to.be.at.least(1);
});
```

## Consequences

### Positive

1. **Zero Visual Regression**: Phase 2 renders same 7-node spine as seed data
2. **Data Validation**: `forksDetected >= 1` proves alternative detection works
3. **Phase 3 Ready**: `alternativesByNode` map guides checkpoint placement
4. **Backward Compatible**: Seed data remains functional (default path)
5. **Testable**: Cypress can assert metadata without UI dependencies

### Negative

1. **Intermediate State**: Bridge ingests alternatives but doesn't render them (feels incomplete)
2. **Type Mapping Compromise**: Conservative mapping (e.g., `job → gate`) may need refinement in Phase 4
3. **Memoization Dependency**: Bridge runs on every `lifePathGraph.graph` change (could optimize with version hash)

### Risks Mitigated

- **Remount Risk**: Bridge runs in `useMemo`, stable unless graph changes
- **ID Collision**: Canonical slugs prevent path identity conflicts
- **Layout Drift**: Bridge doesn't set positions (layout engine handles placement)

## Alternatives Considered

### 1. Server-Side Bridge (Rejected)
**Pros**: Pre-compute graph transformations  
**Cons**: Adds deployment complexity; Phase 2 is dev-only (no prod traffic)

### 2. Inline Mapping (Rejected)
**Pros**: No separate bridge module  
**Cons**: Pollutes canvas file; harder to test/reuse

### 3. Eager Alternative Rendering (Rejected)
**Pros**: Ship visuals immediately  
**Cons**: Violates Phase 2 scope (zero visual change); risks UX churn

## Implementation Notes

### Phase 3 Bridge Enhancements

When adding checkpoint nodes:

```typescript
// Detect fork points
Object.entries(meta.alternativesByNode).forEach(([nodeId, count]) => {
  if (count >= 2) {
    // Insert checkpoint node before fork
    const checkpointNode = createCheckpointNode(nodeId, count);
    nodes.push(checkpointNode);
  }
});
```

### Credit Transfer Metadata (Phase 4)

`GraphEdge.creditTransferRate` already flows through to `V3Edge.data.transferRate`:

```typescript
edges.push({
  id: ge.id,
  source: ge.sourceId,
  target: ge.targetId,
  kind: mapEdgeType(ge.type),
  data: {
    transferRate: ge.creditTransferRate, // ← Available for Phase 4
  },
});
```

### Ranking Algorithm (Phase 3+)

`rankAlternatives()` helper included (not used in Phase 2):

```typescript
export function rankAlternatives(
  alternatives: GraphNode[],
  weights = VERT.RANKING_WEIGHTS
): { top2: GraphNode[]; overflow: GraphNode[] }
```

Uses `RANKING_WEIGHTS` (0.4/0.3/0.2/0.1) to deterministically select top-2 inline alternatives.

## Validation

### Cypress Tests

`cypress/e2e/v3-bridge-smoke.cy.ts`:

✅ Renders with `?source=lifepath` without errors  
✅ Exposes `__dumpV3().meta` with expected keys  
✅ Detects `meta.forksDetected >= 1` (for enriched graphs)  
✅ Maintains node count baseline (≥7 nodes)  
✅ No ReactFlow remounts (`instanceId` stable)  
✅ Grid alignment preserved (all positions divisible by 8)

### Success Criteria

- [ ] Bridge function compiles with correct types
- [ ] `?source=lifepath` renders successfully
- [ ] Console logs "N alternatives detected" (N ≥ 1)
- [ ] `__dumpV3().meta.forksDetected` equals expected count
- [ ] Visual output identical to seed data
- [ ] No performance regression (<100ms bridge execution)

## References

- [ADR 006: Phase 1 Contracts & Types](./006-v3-phase1-contracts.md)
- [Life Path Graph Types](../types/lifePathGraph.ts)
- [V3 Type System](../pages/EduTree/v3/types/v3.ts)
- [RANKING_WEIGHTS](../pages/EduTree/v3/utils/layoutTokensVertical.ts#L30-L35)

## Next Phase

**Phase 3: Checkpoint Rendering**
- Create `checkpoint` nodes where `alternativesByNode[nodeId] >= 2`
- Render top-2 alternatives inline (side-by-side)
- Open drawer on checkpoint click (matrix view for overflow)
- Dim non-selected branches (CSS-only, no geometry changes)
