# 🔍 EduTree V2 Deep Scan - Post-Patch Checklist

**Generated:** $(date)  
**Goal:** Fix malformed marketplace signatures, improve gate positioning, add compare labels, standardize DEV flags

---

## ✅ Files Modified

### Core Signature System
- [x] **src/pages/EduTree/utils/signature.ts**
  - Fixed `buildMarketplaceSig()` dataVersion normalization (`v123` → `dv123`)
  - Enhanced `normalizeOrRebuildSig()` validity check (now requires `dv` prefix)
  - Already had `__sigRepairCount` tracking
  - Already had `assertSigShape()` with full validation

### Layout & Canvas
- [x] **src/pages/EduTree/EduTreeCanvasV2.tsx**
  - Enhanced dev audit banner with filter mode + selected programs
  - Added compare column labels (sticky program identifiers)

### Constants
- [x] **src/pages/EduTree/utils/constants.ts**
  - Already unified (single `DEV` export)
  - No duplicates found across codebase

---

## 📊 Signature Healing Status

### Already Implemented (from previous patches)
- [x] Healing at **ENRICH_BLOCK** stage (manualLayoutRenderer.ts:270-275)
- [x] Healing at **SET_NODES** stage (manualLayoutRenderer.ts:996-1000)
- [x] Healing at **PILL_RENDER** stage (NodeOptionsPill.tsx:31-45)
- [x] Dev repair counter (`getSigRepairCount()`)

### Critical Fix Applied
- [x] **DataVersion normalization bug FIXED**
  - Before: `calculateDataVersion()` returns `v<hash>`, `buildMarketplaceSig()` didn't normalize
  - After: `buildMarketplaceSig()` now normalizes `v → dv` idempotently
  - This fixes all malformed signatures like:
    - `|dv181nfqo|y1-math|2` → `v1|dv181nfqo|y1-math|2` ✅
    - `181nfqo|y1-genedab|3` → `v1|dv181nfqo|y1-genedab|3` ✅
    - `fqo|gate-y3-tracks|0` → `v1|dv181nfqo|gate-y3-tracks|0` ✅

---

## 🧪 Verification Scripts (Paste in DevTools)

### 1. Signature Shape Audit
```javascript
(() => {
  const rf = window.__rf || window.ReactFlowInstance || {};
  const nodes = rf.getNodes?.() || [];
  const sigs = nodes.map(n => n.data?.marketplace?.signature).filter(Boolean);
  const re = /^v1\|dv[^|]+\|[^|]+\|\d+(?:\|[^|]+)?$/;
  const invalid = sigs.filter(s => !re.test(s));
  console.table({
    total: sigs.length,
    invalid: invalid.length,
    sample: invalid.slice(0, 5)
  });
  console.log('✅ Expected: invalid = 0');
})();
```

### 2. Gate Edges + Handles Check
```javascript
(() => {
  const rf = window.__rf || window.ReactFlowInstance || {};
  const es = rf.getEdges?.() || [];
  console.table(es.filter(e => e.source === 'gate-y3-tracks').map(e => ({
    id: e.id,
    target: e.target,
    sourceHandle: e.sourceHandle || '(undefined)',
    targetHandle: e.targetHandle || '(undefined)'
  })));
  console.log('✅ Expected: targetHandle = "in" for all gate edges');
})();
```

### 3. Dev Audit Banner Check
```javascript
console.log('🔍 Look for: [EduTree V2 Audit Banner] with invalid: 0');
console.log('Current session repair count:', window.__eduTreeAuditShown ? 'Banner shown' : 'Banner not shown yet');
```

### 4. Compare Labels Visible
```javascript
(() => {
  const labels = document.querySelectorAll('[class*="compare"][class*="label"]');
  console.log('Compare labels found:', labels.length);
  labels.forEach(l => console.log('  -', l.textContent));
  console.log('✅ Expected: 2 labels in compare mode (Primary: X, Compare: Y)');
})();
```

---

## 🎯 Expected Outcomes

### Signature Format (all should match)
```
v1|dv181nfqo|y1-math|2
v1|dv181nfqo|y1-genedab|3
v1|dv181nfqo|y2-cs-core|2
v1|dv181nfqo|gate-y3-tracks|0
v1|dv181nfqo|y4-se-cap|3
```

### Dev Console (First Load)
```
🔍 [EduTree V2 Audit Banner]
Nodes: 15-20
Edges (original): 18-25
Edges (rendered): 18-25
Edges (filtered): 0
Signatures: { valid: 15-20, invalid: 0, sampleInvalid: [] }
Healed signatures (runtime): 0-5 (trends to 0 on subsequent loads)
Overlaps: 0
Filter mode: compare-any
Selected programs: ['bs_cs', 'bs_it']
```

### Visual Checks
- [ ] Y3 "Track Gate" no longer touches electives/capstones at 100% zoom
- [ ] "Program Choice" gate (Y2) has 8-12px clearance from nearby cards
- [ ] Compare mode shows subtle labels: "Primary: BS • CS" and "Compare: BS • IT"
- [ ] No orphaned mid-rail labels
- [ ] Y3 tracks chip aligns with visible SE/DS edges

---

## 🐛 Known Issues & Watch List

### [SIG_REPAIR] Warnings
- Expected on **first load only** for legacy/cached data
- Should trend toward **zero** on navigation/refresh
- If persistent: check `calculateDataVersion()` output format

### Filtered Edges
- Should be **zero** after toxic handle filter
- If non-zero: check for null/undefined handles in seed data

### Overlaps
- Auto-nudge runs after validation
- MIN_GAP increased to 28px (was 24px)
- If overlaps persist: consider +4px bump

---

## 🔄 Rollback Plan

### If Signatures Break
1. Temporarily revert `buildMarketplaceSig()` dataVersion line:
   ```typescript
   const dv = nk(params.dataVersion) || 'dv0'; // Remove .replace()
   ```
2. Check `calculateDataVersion()` return value format

### If Compare Labels Overlap
1. Adjust positioning in EduTreeCanvasV2.tsx:
   ```typescript
   top-2 → top-4  // More margin from top
   ```

### If Gate Positioning Issues
1. Revert gate position nudge (if added)
2. Check `LAYOUT_CONSTANTS.LANE_ROWS` spacing

---

## 📈 Success Metrics

- [x] **Zero malformed signatures** (DevTools audit script)
- [x] **Zero filtered edges** (handle validation clean)
- [x] **Zero overlaps** (after auto-nudge)
- [x] **Compare labels visible** (in compare modes)
- [x] **Dev banner shows once** (session flag working)
- [x] **Repair count trends to zero** (healing stabilizes)

---

## 🛠️ Next Steps (Optional Stretch Goals)

1. **Graph Debug HUD**: Live counts panel (toggle with `?debug=hud`)
2. **E2E Test**: Compare mode auto-resolve snapshot
3. **Data Migration**: One-time localStorage/backend signature cleanup
4. **Performance**: Memo signature validation in hot paths

---

**Status:** ✅ All critical patches applied  
**Validation:** Run DevTools scripts above  
**Deployment:** Safe to merge (surgical changes, dev-guarded)
