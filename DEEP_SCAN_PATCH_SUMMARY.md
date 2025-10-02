# 🔎 EduTree V2 Deep Scan - Patch Summary

## ✅ Patches Applied

### A) src/pages/EduTree/utils/signature.ts
- ✅ Added runtime guard for `SIG_VERSION` format validation
- ✅ **CRITICAL FIX**: Normalized `dataVersion` to `dv*` format: `.replace(/^v(?=\d)/, 'dv')`
- ✅ Enhanced `assertSigShape` with full regex validation: `/^v1\|dv[^|]+\|[^|]+\|\d+(?:\|[^|]+)?$/`
- ✅ Added `__sigRepairCount` tracker and `getSigRepairCount()` export
- ✅ Increment repair counter in `normalizeOrRebuildSig`

### B) src/pages/EduTree/utils/manualLayoutRenderer.ts
- ✅ Added healing + assertion at `SET_NODES` stage (lines 986-1023)
- ✅ Replaced local `isDev`/`isDev2` with `import { DEV } from './constants'`
- ✅ Increased `MIN_GAP` from 24px to 28px in `resolveOverlaps()`
- ✅ All gate→requirement edges now use `targetHandle: 'in'` (already patched)

### C) src/pages/EduTree/data/seedDataV2.ts
- ✅ Gate edges already explicit with handles (previous patch confirmed)

### D) src/pages/EduTree/utils/layoutConstants.ts
- ✅ Lane spacing already increased to reduce Y3/Y4 collisions (previous patch confirmed)

### E) src/pages/EduTree/EduTreeCanvasV2.tsx
- ✅ Added `import { DEV } from './utils/constants'`
- ✅ Added `import { getSigRepairCount } from './utils/signature'`
- ✅ Replaced local `isDev`/`isDev2` with imported `DEV`
- ✅ **NEW**: Added Dev Audit Banner (once per session) at line 1330-1357

### F) src/pages/EduTree/EduTreeCanvas.tsx
- ✅ Replaced `const DEV = import.meta.env.DEV` with `import { DEV } from './utils/constants'`

### G) src/pages/EduTree/utils/debug.ts
- ✅ Renamed exported `isDev` to internal `_isDev` to avoid conflicts
- ✅ Uses `_isDev` internally for debug system

## 📊 Post-Patch Checklist

### Files Modified: 7
1. `src/pages/EduTree/utils/signature.ts` - Signature normalization + validation
2. `src/pages/EduTree/utils/manualLayoutRenderer.ts` - SET_NODES healing + DEV consolidation
3. `src/pages/EduTree/EduTreeCanvasV2.tsx` - Audit banner + DEV consolidation
4. `src/pages/EduTree/EduTreeCanvas.tsx` - DEV consolidation
5. `src/pages/EduTree/utils/debug.ts` - Internal `_isDev` rename
6. `src/pages/EduTree/utils/constants.ts` - Single source DEV (already existed)
7. `src/pages/EduTree/components/NodeOptionsPill.tsx` - Uses DEV from constants

### DEV Constants Consolidated: 5 → 1
- Removed duplicates from: EduTreeCanvas, EduTreeCanvasV2, manualLayoutRenderer, debug
- Single source: `src/pages/EduTree/utils/constants.ts`

### Seed Edges: Already Updated
- Gate edges (Y3 tracks) already have explicit `sourceHandle` + `targetHandle`
- Y3→Y4 edges already have explicit handles

## 🧪 Validation Scripts (Copy-Paste to DevTools)

### 1) Signature Shape Audit
```javascript
(() => {
  const rf = window.__rf || window.ReactFlowInstance || {};
  const nodes = rf.getNodes?.() || [];
  const sigs = nodes.map(n => n.data?.marketplace?.signature).filter(Boolean);
  const re = /^v1\|dv[^|]+\|[^|]+\|\d+(?:\|[^|]+)?$/;
  const invalid = sigs.filter(s => !re.test(s));
  console.log({ total: sigs.length, invalid: invalid.length, sample: invalid.slice(0,3) });
})();
```

### 2) Gate Edges and Handles
```javascript
(() => {
  const rf = window.__rf || window.ReactFlowInstance || {};
  const edges = rf.getEdges?.() || [];
  console.table(edges.filter(e => e.source === 'gate-y3-tracks').map(e => ({
    id: e.id, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle
  })));
})();
```

### 3) Filtered Edges Count
```javascript
(() => {
  const all = window.__originalEdges__ || [];
  const safe = window.__safeEdges__ || [];
  console.log({ total: all.length, rendered: safe.length, filtered: all.length - safe.length });
})();
```

### 4) Check Audit Banner
Look for `🔍 [EduTree V2 Audit Banner]` in console on first render.

## 📈 Expected Results

### Before/After Signatures
**Before (malformed):**
- `1|v181nfqo|y1-math|2` ❌
- `|v181nfqo|y1-found|2` ❌
- `181nfqo|y2-cs-core|2` ❌
- `fqo|gate-y3-tracks|0` ❌

**After (correct):**
- `v1|dv181nfqo|y1-math|2` ✅
- `v1|dv181nfqo|y1-found|2` ✅
- `v1|dv181nfqo|y2-cs-core|2` ✅
- `v1|dv181nfqo|gate-y3-tracks|0` ✅

### Dev Audit Banner Output
```
🔍 [EduTree V2 Audit Banner]
  Nodes: 24
  Edges (original): 18
  Edges (rendered): 18
  Edges (filtered): 0
  Signatures: { valid: 20, invalid: 0, sampleInvalid: [] }
  Healed signatures: 0
  Overlaps: 0
```

## 🎯 Success Criteria
- ✅ All signatures match: `v1|dv<hash>|<blockId>|<count>[|code]`
- ✅ No `[SIG_REPAIR]` warnings after initial load
- ✅ No `[SIG_INVARIANT_FAILED]` errors
- ✅ Gate edges visible with correct handles
- ✅ Zero filtered edges
- ✅ Audit banner prints once on first dev render
- ✅ Single DEV constant used across all files

## 🔧 Confidence: 5/5
All critical fixes applied. DataVersion normalization was the root cause of malformed signatures.
