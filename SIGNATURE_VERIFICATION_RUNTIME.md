# Runtime Signature Verification Scripts

Run these in DevTools console after a fresh page load to verify all signatures are canonical.

## 1. Comprehensive Validator

```js
(() => {
  const rf = window.__rf || window.ReactFlowInstance || {};
  const nodes = rf.getNodes?.() || [];
  const sigs = nodes.map(n => n?.data?.marketplace?.signature).filter(Boolean);
  const re = /^v1\|dv[a-z0-9]+\|[A-Za-z0-9_-]+\|\d+(?:\|[a-z0-9_-]+)?$/;

  const invalid = sigs.filter(s => !re.test(s));
  const leadingPipe = sigs.filter(s => s.startsWith('|'));
  const wrongDv = sigs.filter(s => !s.split('|')[1]?.match(/^dv[a-z0-9]+$/));

  console.table([
    { metric: 'total', value: sigs.length },
    { metric: 'invalid', value: invalid.length },
    { metric: 'leading_pipes', value: leadingPipe.length },
    { metric: 'malformed_dv', value: wrongDv.length },
  ]);
  console.log('sampleInvalid', invalid.slice(0, 5));
})();
```

**Pass criteria:** `invalid: 0`, `leading_pipes: 0`, `malformed_dv: 0`

## 2. Leading Pipe Detector

```js
(() => {
  const rf = window.__rf || window.ReactFlowInstance || {};
  const nodes = rf.getNodes?.() || [];
  const bad = nodes.map(n => n?.data?.marketplace?.signature).filter(Boolean).filter(s => s.startsWith('|'));
  console.log('Leading pipes:', bad.length, bad.slice(0, 3));
})();
```

**Pass criteria:** `Leading pipes: 0`

## 3. Case Preservation Spot-Check (genedAB)

```js
(() => {
  const rf = window.__rf || window.ReactFlowInstance || {};
  const nodes = rf.getNodes?.() || [];
  const hit = nodes.find(n => /genedab|genedAB/i.test(n?.id || ''));
  if (!hit) return console.log('No genedAB-ish node in current graph');
  const sig = hit?.data?.marketplace?.signature || '';
  const idToken = (sig.split('|')[2] || '');
  console.log({ 
    nodeId: hit.id, 
    signature: sig, 
    blockIdToken: idToken, 
    preservedCase: /genedAB/.test(idToken) ? '✅ PASS' : '❌ FAIL' 
  });
})();
```

**Pass criteria:** `preservedCase: ✅ PASS`

## 4. Auto-Repair Counter

```js
(() => {
  const rf = window.__rf || window.ReactFlowInstance || {};
  const nodes = rf.getNodes?.() || [];
  console.log('Total nodes:', nodes.length);
  console.log('Check console for [SIG_AUTOREPAIR] warnings - should be ZERO on clean data');
})();
```

**Pass criteria:** Zero `[SIG_AUTOREPAIR]` warnings in console

## 5. All Signatures Sample

```js
(() => {
  const rf = window.__rf || window.ReactFlowInstance || {};
  const nodes = rf.getNodes?.() || [];
  const sigs = nodes.map(n => ({
    id: n.id,
    sig: n?.data?.marketplace?.signature
  })).filter(x => x.sig);
  
  console.log('First 10 signatures:');
  console.table(sigs.slice(0, 10));
})();
```

## Expected Canonical Format

All signatures should match:
```
v1|dv<hash>|<BlockId (case-preserved)>|<count>[|<selectedCode lowercase>]
```

Examples of valid signatures:
- `v1|dv181nfqo|y1-math|2`
- `v1|dv181nfqo|y1-genedAB|3` (note mixed case preserved)
- `v1|dv181nfqo|gate-y2-programs|0`
- `v1|dv181nfqo|y4-it-cap|3|cs101`

Examples of INVALID (should never appear):
- `|dv181nfqo|y1-math|2` (leading pipe)
- `181nfqo|y1-math|2` (missing v1|dv)
- `v181nfqo|y1-math|2` (wrong dv token)
- `v1|dv181nfqo|y1-genedab|3` (lowercased blockId when should be genedAB)
