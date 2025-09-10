# EduTree — Staggered Edges V2: Toggle & Debug (1-pager)

### What this is

A tiny, copy-pasteable dev guide for operating the staggered edge reveal in `/edu-tree`.

---

## Quick toggles

**Runtime (URL params)**

* `?eduTreeStaggeredEdgesV2=true` → enable staggered reveal
* `?eduTreeStaggeredEdgesV2=false` → show all edges immediately (safe rollback)
* Optional visuals:

  * `?eduTreeOutcomes=false` → disables path highlighting
  * `?eduTreeLanes=false` → hides year lane background

**Code (defaults)**

```ts
// featureFlags.ts
eduTreeStaggeredEdgesV2: toBool(
  getFlagValue('eduTreeStaggeredEdgesV2', 'edu-tree-staggered-edges-v2', 'true')
);
```

**Where it wires in**

```ts
// EduTreeCanvas.tsx
const [allEdges, setAllEdges] = useState<Edge[]>([]);
const { visibleEdges, isRevealing, forceRevealAll } = useStaggeredEdgesV2(
  allEdges,
  nodes,
  { enabled: flags.eduTreeStaggeredEdgesV2, batchDelayMs: __DEV__ ? 800 : 650, emergencyTimeoutMs: 2000 }
);

// Keep React Flow in sync with flag:
useEffect(() => {
  setEdges(flags.eduTreeStaggeredEdgesV2 ? visibleEdges : allEdges);
}, [visibleEdges, allEdges, flags.eduTreeStaggeredEdgesV2]);
```

---

## What “good” looks like

* **2–4 waves** of edges reveal left → right (small graphs still animate via sub-batches).
* **No “Emergency timeout”** in normal cases (prod logs are suppressed).
* **fitView** runs once (debounced) with **padding 0.4** if a terminal exists, else 0.2.
* **StrictMode** does not double-schedule (guarded by `scheduledKeyRef`).

---

## Dev console cues

In **development** you should see (examples):

```
[StaggeredEdgesV2] Created 4 batches for 10 edges
[StaggeredEdgesV2] Terminal edges: 2
[StaggeredEdgesV2] Revealed batch 1/4: 3 edges (total: 3)
[StaggeredEdgesV2] Revealed batch 2/4: 1 edges (total: 4)
...
📏 EduTree: fitView applied (padding: 0.4, terminal detected: true)
```

In **production**, batch logs are hidden. You'll still see the fitView summary.

---

## Fast debug flow (60s)

1. **Flag sanity**
   Open `/edu-tree?eduTreeStaggeredEdgesV2=true`. Confirm waves appear.
   Flip to `false` → edges draw instantly (no flicker).

2. **Batch math**
   In dev, you should get `Created N batches…`.
   If `N = 1` and edges > 1, we auto split into two sub-batches.

3. **Timeout safety**
   If you ever see "Emergency timeout … revealing all", note the graph size & timing.
   (We compute a dynamic floor: `(batches-1)*delay + 400ms`, min 1200ms.)

4. **Path highlighting**
   If dimming/highlighting seems stale, check the console for errors.
   We guard state updates by diffing (`lastPathRef`) to avoid loops.

---

## Common gotchas & fixes

* **"It animated twice in dev."**
  React StrictMode renders effects twice. We guard with a scheduling key:
  `sortedColumns|edgeCount|batchDelayMs`. If logs still duplicate, ensure `useEffect` deps match the hook signature and you aren't hot-reloading mid-reveal.

* **"Nothing animates."**

  * Check the flag: `?eduTreeStaggeredEdgesV2=true`.
  * Ensure React Flow is fed `visibleEdges` (not `allEdges`).
  * Verify nodes have positions before batching (layout runs first).

* **"fitView keeps firing."**
  We debounce fitView. If it still repeats, make sure you didn't add `nodes`/`edges` objects—not lengths—to the fitView effect deps.

* **Browser console warnings ("vr", "battery", etc.)**
  Harmless. If desired, remove unused entries from any `<iframe sandbox allow>` list.

---

## Quick knobs (no code dive)

* **Make waves faster/slower**

  * Dev: change `batchDelayMs` from `800` → e.g., `600`
  * Prod: change `650` → e.g., `500`

* **Always reveal immediately**

  * URL: `?eduTreeStaggeredEdgesV2=false`
  * Or set default `'false'` in `featureFlags.ts` for temporary rollbacks.

* **Force finish reveal**

  * Call `forceRevealAll()` from the dev panel or console when exposed.

---

## Minimal QA before merging

* Cold load `/edu-tree` → waves present, no timeout.
* Toggle `?eduTreeStaggeredEdgesV2=false` → instant edges, no gaps.
* Toggle `?eduTreeOutcomes=false` → no path updates/logs.
* Dev console shows **one** "Created N batches …" line per load (no duplicates).
* fitView runs once with expected padding.

That's it. Drop this into your repo's `/docs/dev/edutree-staggered-edges.md` or your team wiki and you're set.
