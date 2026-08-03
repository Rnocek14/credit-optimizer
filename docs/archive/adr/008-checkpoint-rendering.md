# ADR 008: Checkpoint Node Rendering (Phase 3a)

**Date:** 2025-10-08  
**Status:** Accepted  
**Context:** Phase 3a implementation - Checkpoint Infrastructure

## Decision

Inject checkpoint nodes at fork points to enable alternative path selection, gated behind `?checkpoints=1` feature flag.

## Architecture

### Checkpoint Injection
- **Detection:** Use `meta.alternativesByNode` from Phase 2 bridge
- **Trigger:** Only inject when `count >= 1` (fork exists)
- **Placement:** Position checkpoint immediately after source node
- **Type:** New node type `'checkpoint'` with diamond/badge visual design
- **Feature Flag:** `?checkpoints=1` required to render (maintains Phase 2's "no visual change" guarantee)

### Data Flow
```
Bridge (Phase 2) 
  → meta.alternativesByNode 
  → checkpointManager.injectCheckpoints() 
  → layoutEngine (positions checkpoint nodes)
  → V3CheckpointNode component
```

### Node Structure
```ts
type: 'checkpoint'
data: {
  tier: number,
  alternativeCount: number,
  sourceNodeId: string,
  title: 'Choose Your Path',
  showAlternatives: true,
  lineage: PathLineage
}
position: { x: 0, y: 0 } // Layout engine assigns final position
```

### Edge Connectivity
- **Spine edge:** Source node → Checkpoint node (`kind: 'spine'`)
- Maintains graph topology for layout engine
- No downstream alternative edges yet (Phase 3b)

## Constraints

- **Layout Dependency:** Checkpoints require `layout=vertical` (Phase 3a hardening)
- Attempting to use `?checkpoints=1` without `layout=vertical` results in silent rejection with console warning
- Future: May expand to horizontal layout in Phase 4 if demand exists

## Implementation

### Files Created
- `src/pages/EduTree/v3/engine/checkpointManager.ts` - Injection logic
- `src/pages/EduTree/v3/components/V3CheckpointNode.tsx` - UI component
- `src/pages/EduTree/v3/engine/__tests__/checkpointManager.test.ts` - Unit tests
- `cypress/e2e/v3-phase3-checkpoints.cy.ts` - E2E tests

### Files Modified
- `src/pages/EduTree/v3/types/v3.ts` - Added `checkpoint` to `NodeType`, checkpoint fields to `V3NodeData`
- `src/pages/EduTree/v3/engine/buildGraph.ts` - Checkpoint injection before layout
- `src/pages/EduTree/v3/engine/layoutEngine.ts` - Checkpoint positioning logic
- `src/pages/EduTree/v3/utils/layoutTokensVertical.ts` - Added `TIER_SPACING_PX: 160`
- `src/pages/EduTree/v3/EduTreeV3Canvas.tsx` - Node registration, feature flag reading

## Testing Strategy

All unit and Cypress tests implemented with comprehensive coverage of:
- Injection logic and idempotency
- Type safety and edge connectivity
- Grid alignment (8px snapping)
- Feature flag gating (`?checkpoints=1`)
- Layout guard (rejects checkpoints in horizontal layout)

## Next Steps (Phase 3b)

1. Create `AlternativesDrawer.tsx` component
2. Implement `rankAlternatives()` with `RANKING_WEIGHTS`
3. Add CSS dimming for non-selected paths
4. Wire up checkpoint click → drawer open
5. Display sortable alternatives matrix
