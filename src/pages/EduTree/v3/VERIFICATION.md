# V3 Layout Verification Checklist

## Automated Tests

Run `npm test` to verify all layout invariants:

### ✅ Token Tests (`__tests__/layoutTokens.test.ts`)
- Lane spacing safety: `2 * TRACK_COLUMN_OFFSET >= NODE_WIDTH + H_GAP`
- Width matches CSS: `NODE_WIDTH === 232`
- Vertical spacing: `LANE_GAP > 50`
- Grid alignment for all spacing tokens
- Year columns properly spaced

### ✅ Layout Engine Tests (`__tests__/layoutEngine.test.ts`)
- Correct X assignment per year
- Grid snapping for all positions
- Track lane offsets (SE/DS at ±TRACK_COLUMN_OFFSET)
- Deterministic stacking in buckets
- **NEW**: Strict lane centers for gates and bundles
- **NEW**: Gates positioned in vertical slots between year groups

### ✅ Region Manager Tests (`engine/__tests__/regionManager.test.ts`)
- Corridor height >= bucket size * stepY
- Corridors vertically stacked per year without overlap
- SE/DS lanes within year do not overlap

### ✅ Overlap Validator Tests (`__tests__/overlapValidator.test.ts`)
- Detects no overlaps for spaced nodes
- Detects overlaps for coincident nodes

---

## Manual Verification (Collapsed View)

Open `/edu-tree-v3` and perform these checks:

### 1. Click "Validate Overlaps"
**Expected**: "No overlaps ✅" or "Overlaps: 0"

### 2. Click "Measure DOM"
**Expected**: 
- min ≈ 232px
- avg ≈ 232px
- max ≈ 232px
- outliers list: empty

### 3. Count Nodes/Edges (Visual or HUD)
**Expected**: 
- ~7 nodes (5 bundles: y1, y2, y3-se, y3-ds, y4 + 2 gates)
- ~5 edges (spine/gate only, no prereq web)

### 4. Visual Gate Positioning
**Expected**: 
- ProgramGate sits **between** Y1 and Y2 bundles
- TrackGate sits **between** Y2 and Y3 bundles
- Gates are **not overlapping** any bundle cards

### 5. Determinism Check
**Expected**: 
- Reload page 3 times
- All node positions remain identical
- No drift or jitter

---

## Manual Verification (Expanded View)

### 6. Expand One Bundle (e.g., y3-se-bundle)
Click the "+" button on Y3 SE bundle

### 7. Re-validate
**Expected**: 
- "Validate Overlaps" still returns 0
- "Measure DOM" still shows ~232px
- Other bundles remain collapsed
- Only child-relevant edges appear (no spaghetti)

### 8. Collapse Again
Click the "−" button

**Expected**: 
- Returns to collapsed state
- 0 overlaps maintained

---

## Console Probe Scripts

Paste these into browser console for surgical debugging:

### Print nodes wider than 232px
\`\`\`js
[...document.querySelectorAll('.react-flow__node')].map(el => {
  const w = el.getBoundingClientRect().width;
  return { id: el.dataset.id, w };
}).filter(x => x.w > 233);
\`\`\`

### Verify gate positions
\`\`\`js
window.__dumpV3?.().nodes
  .filter(n => n.type === 'gate')
  .map(g => ({
    id: g.id,
    y: g.position.y,
    year: g.data.year,
    x: g.position.x,
    anchorX: g.data.anchorX
  }));
\`\`\`

### Check strict lane centers
\`\`\`js
window.__dumpV3?.().nodes.map(n => {
  const snap = (v) => Math.round(v / 8) * 8;
  const yearCol = { Y1: 300, Y2: 700, Y3: 1100, Y4: 1500 }[\`Y\${n.data.year || 1}\`];
  const offset = 128;
  const expected = 
    n.type === 'gate' || !n.data.trackId ? snap(yearCol) :
    n.data.trackId === 'se' ? snap(yearCol - offset) :
                               snap(yearCol + offset);
  return {
    id: n.id,
    actual: n.position.x,
    expected,
    drift: Math.abs(n.position.x - expected)
  };
}).filter(x => x.drift > 4);
\`\`\`

---

## Visual Debug Mode

Uncomment rules in `dev/VisualDebug.css` to enable:
- Node outlines (different colors per type)
- Width labels on nodes
- Grid overlay for snap alignment

---

## Common Issues & Fixes

### Overlaps Detected
**Cause**: Component grows past 232px
**Fix**: Add `w-full overflow-hidden` to inner Card, use `truncate` or `line-clamp-1` on text

### Gates Overlap Bundles
**Cause**: Gates share bucket with bundles
**Fix**: Verify `layoutEngine.ts` splits gates from regularNodes, assigns fixed vertical slots (1.5× and 3.5× stepY)

### Horizontal Drift
**Cause**: Collision resolver adjusts X
**Fix**: Ensure collision resolver is vertical-only, does not modify X after strict lane assignment

### Year Column Mismatch
**Cause**: Missing YEAR_COL entry
**Fix**: Verify `YEAR_COL.Y1..Y4` exist in `layoutTokensV3.ts`

### COL_TOLERANCE Issues
**Cause**: Tolerance too large
**Fix**: Keep `COL_TOLERANCE < (NODE_WIDTH + H_GAP) / 2`

---

## Acceptance Criteria

- [ ] All automated tests pass
- [ ] Collapsed view: 0 overlaps
- [ ] Collapsed view: all nodes ~232px width
- [ ] Collapsed view: 5 bundles + 2 gates visible
- [ ] Gates positioned between year groups
- [ ] Deterministic on reload
- [ ] Single bundle expansion: 0 overlaps
- [ ] Single bundle expansion: no spaghetti edges
- [ ] Console probes show no drift/outliers

---

## Ignored Sandbox Noise

These console messages are harmless infrastructure chatter:
- WebSocket 404/failed connection
- `lovable-api.com ... ERR_HTTP2_PROTOCOL_ERROR`
- `Unrecognized feature: 'vr' / 'battery' / 'ambient-light-sensor'`
