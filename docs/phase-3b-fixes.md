# Phase 3b: Regression Fixes & Guardrails

**Date**: 2025-10-10
**Status**: Fixed

## Regressions Fixed

### 1. ✅ Type Safety in V3CheckpointNode
**Issue**: Component reverted to using `(data as any)` casts, breaking IntelliSense and type safety.

**Fix**: Updated to use proper type-safe property access with nullish coalescing:
```typescript
const title = String(data?.title ?? 'Choose Your Path');
const alternativeCount = Number(data?.alternativeCount ?? 0);
const sourceNodeId = String(data?.sourceNodeId ?? '');
const onCheckpointClick = data?.onCheckpointClick as ((checkpointId: string, sourceNodeId: string) => void) | undefined;
```

**Files Modified**: `src/pages/EduTree/v3/components/V3CheckpointNode.tsx`

---

### 2. ✅ Edge Type Flow Consistency
**Issue**: Potential edge type mixing between LifePath, V3, and ReactFlow edge formats.

**Current State**: 
- `applyAlternative()` operates on **LifePath edges** (`sourceId/targetId`, `type: 'alternative'` → `'stacksInto'`) ✅
- Bridge pipeline: `lifePathToV3()` → `injectCheckpoints()` → `createCollapsedView()` ✅
- Vertical layout uses `mapEdgesVertical(visibleEdges, visibleNodes)` ✅
- Horizontal fallback uses `buildEduTreeGraph(...)` ✅

**No changes needed** - types are correctly separated and converted at appropriate boundaries.

---

## Guardrails Added

### 3. ✅ Locked Alternative Check
**Requirement**: Prevent users from selecting alternatives with missing prerequisites.

**Implementation**: Added prerequisite validation in `handleSelectAlternative()`:
```typescript
const selectedAlt = alternatives.find(alt => alt.node.id === selectedNodeId);
if (selectedAlt?.prerequisiteStatus === 'locked') {
  toast.error(`Cannot select this alternative. Missing prerequisites: ${selectedAlt.missingPrereqs?.join(', ')}`);
  return;
}
```

**Files Modified**: `src/pages/EduTree/v3/EduTreeV3Canvas.tsx` (line ~913)

---

### 4. ✅ DEV Test Edge Removed
**Status**: Already removed in Commit 1 implementation.

**Verification**: No test edges present unless `VITE_SHOW_TEST_EDGE=true` (which is not set).

---

### 5. ✅ Nil Data Safety
**Requirement**: Safe handling of potentially undefined node data.

**Fixes Applied**:

**a) AlternativesDrawer.tsx**:
```typescript
// Title fallback
{node.title ?? node.id}

// Metrics with defaults
{node.estimatedHours ?? 0}h
${(node.cost ?? 0).toLocaleString()}

// Credits conditional
{(node.credits ?? 0) > 0 && (
  <div>...</div>
)}
```

**b) getAlternatives.ts** (already fixed in Commit 1):
```typescript
const hasWaiver = (node.tags ?? []).some(tag => ...)
```

**Files Modified**: 
- `src/pages/EduTree/v3/components/AlternativesDrawer.tsx`
- `src/pages/EduTree/v3/engine/getAlternatives.ts`

---

## Diagnostics

### Run in DevTools After Selecting Alternative

```javascript
// 1) Check spine edge exists
const d = window.__dumpV3?.();
({
  nodes: d?.nodes.length,
  edges: d?.edges.length,
  stacksIntoFromSource: d?.edges
    ?.filter(e => e.type === 'stacksInto')
    .slice(0, 10)
    .map(e => ({ id: e.id, source: e.source, target: e.target })),
  checkpointEdges: d?.edges?.filter(e => e.id?.startsWith('ckpt:')).length
});

// 2) Ensure checkpoint edges are valid
(() => {
  const ids = new Set(d?.nodes.map(n => n.id));
  return d?.edges?.filter(e =>
    e.id?.startsWith('ckpt:') &&
    ids.has(e.source) && ids.has(e.target)
  );
})();

// 3) Check LifePath graph (if exposed)
window.__dumpLifePath?.() || 'no LP dump exposed';
```

**Expected Results**:
- ✅ At least one `stacksInto` edge from source to selected alternative
- ✅ `ckpt:` edges only where forks exist
- ✅ No React Flow console warnings

---

## UX Validation Checklist

- [x] Clicking checkpoint with no alternatives → toast "no alternatives right now"
- [x] Selecting locked alternative → toast with missing prerequisites
- [x] Successful selection → toast "Alternative path applied!"
- [ ] ESC closes drawer (nice-to-have, not implemented)
- [ ] Enter/Space on checkpoint (accessibility, not implemented)
- [x] Checkpoint updates after selection (re-evaluated via `injectCheckpoints`)

---

## Performance & Stability

**Verified**:
- `handleSelectAlternative` uses minimal dependencies (lines 994-1000)
- `useMemo/useCallback` prevent unnecessary rebuilds
- Position preservation prevents jarring jumps

**To Test**:
- [ ] 5-10 apply/close cycles → no memory leaks
- [ ] No ReactFlow console errors after rapid selections

---

## Summary

All critical regressions fixed:
1. ✅ Type safety restored in V3CheckpointNode
2. ✅ Edge type flow verified as correct
3. ✅ Locked alternative guard added
4. ✅ DEV test edge confirmed removed
5. ✅ Nil data safety implemented across components

**Ready for user testing** 🎉
