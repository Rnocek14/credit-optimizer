# edu-tree-multipath-design.md

## Scope & Non-Goals
Enhance `/edu-tree` by adding a **track/comparison overlay** to the existing stable React Flow graph.

**Non-Goals**
- No new routes or remounts; **no key-based reinit** of `<ReactFlow>`.
- No data-model or layout engine changes; overlay is **class-based styling** only.
- No element re-creation for highlights.

## Data Contracts
```ts
export type TrackId = string;
export interface TrackDefinition {
  id: TrackId;
  name: string;
  description?: string;
  color?: string;
  blockIds: string[]; // ordered block ids
}

export interface BlockGroupNodeData {
  block: { id: string; title: string; [k: string]: any };
  displayTitle: string;
}

export interface TerminalNodeData {
  block: { id: string; title: string; [k: string]: any };
  displayTitle: string; // MUST come from block.title
}

// Edge normalization (block ids only)
export const eid = (s: string, t: string) => `e-${String(s)}-${String(t)}`;
```

## Rendering Invariants

* `<ReactFlow>` never remounts (no dynamic `key`, no conditional unmount).
* `fitView` only after: RF instance exists + nodes/edges present + ≥1 non-empty highlight set.
* No emergency layout when overlay flag is on.
* Node/edge IDs stable (nodes use `blockId` as `id`, edges use `eid()`).
* Terminal node always uses specialized component and displays `block.title`.

## Highlight Pipeline (3 phases)

**A** Build `rfNodeIdByBlockId` from rendered nodes.
**B** Compute `Set` highlights from TrackDefinitions using `eid()`.
**C** Attach classes to nodes/edges in a final memo before render (no re-creates).

## CSS Class Semantics

Nodes: `.node--dim`, `.node--primary`, `.node--comparison`, `.node--both`
Edges: `.edge--dim`, `.edge--primary`, `.edge--comparison` (dashed), `.edge--both`
Terminal: `.terminal--primary`, `.terminal--comparison`, `.terminal--both` (optional)

Minimal styles:

```css
.node--dim, .edge--dim { opacity: .25; }
.edge--comparison { stroke-dasharray: 6; }
.edge--both { stroke-width: 4px; }
```

## Branching Visualization Rules (non-breaking now)

* Keep current lane layout; optional **branch offset** (Y ±Δ or X ±Δ) when flag enabled.
* Shared foundation centered; specializations offset if feature on.

## Diagnostics

* "Missing comparison path" lists missing block IDs based on current RF map.
* Dev console helpers dump sets & map; dev hotkey `T` toggles Track Validator.

## Acceptance Tests

* No white flash when toggling seed/live or overlay.
* Primary highlights; Comparison adds dashed overlay; shared is thicker.
* Terminal shows full degree title (never literal "degree").
* Missing comparison lists block IDs.
* No emergency layout when overlay flag on.

TrackOverlayPOC.tsx included as separate deliverable.