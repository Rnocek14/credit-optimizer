// src/pages/EduTree/v3/engine/createCollapsedView.ts
import type { V3Graph, V3Node, V3Edge } from "../types/v3";

export type TrackId = "se" | "ds";
export type BundleId =
  | "y1-bundle"
  | "y2-bundle"
  | "y3-se-bundle"
  | "y3-ds-bundle"
  | "y4-bundle";

export interface BundleCard {
  id: BundleId | string;
  year: 1 | 2 | 3 | 4;
  trackId?: TrackId;
  title: string;
  childCount: number;
  totalCredits: number;
  childIds: string[];
}

export function createCollapsedView(fullGraph: V3Graph): {
  visibleNodes: V3Node[];
  visibleEdges: V3Edge[];
  bundles: Map<string, BundleCard>;
} {
  const byYearTrack = new Map<string, V3Node[]>();
  const gates: V3Node[] = [];
  const checkpoints: V3Node[] = [];

  for (const n of fullGraph.nodes) {
    if (n.type === "gate") {
      console.log('[Collapsed View] Found gate node:', { 
        id: n.id, 
        type: n.type, 
        year: n.data?.year,
        data: n.data 
      });
      gates.push(n);
      continue;
    }
    if (n.type === "checkpoint") {
      console.log('[Collapsed View] Found checkpoint node:', { 
        id: n.id, 
        sourceNodeId: n.data?.sourceNodeId,
        alternativeCount: n.data?.alternativeCount
      });
      checkpoints.push(n);
      continue;
    }
    const y = (n.data.year ?? 1) as 1 | 2 | 3 | 4;
    const tk = n.data.trackId as TrackId | undefined;
    const key = tk ? `y${y}-${tk}` : `y${y}`;
    if (!byYearTrack.has(key)) byYearTrack.set(key, []);
    byYearTrack.get(key)!.push(n);
  }

  // Create bundle cards
  const bundles = new Map<string, BundleCard>();
  const bundleNode = (b: BundleCard): V3Node => ({
    id: b.id,
    type: "track-bundle",
    data: {
      year: b.year,
      trackId: b.trackId,
      title: b.title,
      childCount: b.childCount,
      totalCredits: b.totalCredits,
      isExpanded: false,
    },
    position: { x: 0, y: 0 },
  });

  const visibleNodes: V3Node[] = [];
  const makeBundle = (id: string, year: 1 | 2 | 3 | 4, trackId?: TrackId) => {
    const key = trackId ? `y${year}-${trackId}` : `y${year}`;
    const kids = byYearTrack.get(key) ?? [];
    
    console.log(`[Collapsed View] Creating bundle ${id}:`, {
      key,
      childCount: kids.length,
      childIds: kids.map(n => n.id)
    });
    
    if (kids.length === 0) {
      console.warn(`[Collapsed View] No children for bundle ${id}, skipping`);
      return;
    }

    const title = trackId
      ? `Year ${year} ${trackId.toUpperCase()} Track`
      : `Year ${year}`;

    const card: BundleCard = {
      id,
      year,
      trackId,
      title,
      childCount: kids.length,
      totalCredits: kids.reduce((s, n) => s + (n.data.credits_needed ?? 0), 0),
      childIds: kids.map((n) => n.id),
    };
    bundles.set(id, card);
    visibleNodes.push(bundleNode(card));
  };

  // Year/Track bundles (only created if children exist)
  makeBundle("y1-bundle", 1);
  makeBundle("y2-bundle", 2);
  makeBundle("y3-se-bundle", 3, "se");
  makeBundle("y3-ds-bundle", 3, "ds");
  makeBundle("y4-bundle", 4);

  // Always include gates and checkpoints (with validation)
  console.log('[Collapsed View] Adding gates to visible nodes:', gates.map(g => ({ id: g.id, hasYear: !!g.data?.year })));
  console.log('[Collapsed View] Adding checkpoints to visible nodes:', checkpoints.map(c => ({ id: c.id, sourceNodeId: c.data?.sourceNodeId })));
  visibleNodes.push(...gates);
  visibleNodes.push(...checkpoints);

  // FIX #1: Remap checkpoint sourceNodeId from raw node → bundle (if source was collapsed)
  const childToBundle = new Map<string, string>();
  for (const [bundleId, bundle] of bundles.entries()) {
    for (const childId of bundle.childIds || []) {
      childToBundle.set(childId, bundleId);
    }
  }

  checkpoints.forEach(cp => {
    const rawSourceId = cp.data?.sourceNodeId;
    if (!rawSourceId) return;
    
    const bundleId = childToBundle.get(rawSourceId);
    if (bundleId) {
      if (import.meta.env.DEV) {
        console.log('[Collapsed View] Remapping checkpoint source:', {
          checkpointId: cp.id,
          rawSource: rawSourceId,
          bundleTarget: bundleId
        });
      }
      cp.data = { ...cp.data, sourceNodeId: bundleId };
    }
  });

  // FIX #2: Preserve + REMAP checkpoint edges so they point to bundle IDs
  const checkpointIds = new Set(checkpoints.map(c => c.id));
  
  // Edges that touch a checkpoint in the full graph
  const checkpointEdgesRaw = fullGraph.edges.filter(e => 
    checkpointIds.has(e.source) || checkpointIds.has(e.target)
  );
  
  // Remap endpoints from raw child IDs → bundle IDs (if collapsed)
  const remappedCheckpointEdges = checkpointEdgesRaw
    .map(e => {
      const newSource = childToBundle.get(e.source) ?? e.source;
      const newTarget = childToBundle.get(e.target) ?? e.target;
      
      // Namespace the ID to avoid collisions and reflect remap
      const newId = `ckpt:${newSource}->${newTarget}`;
      
      return {
        ...e,
        id: newId,
        source: newSource,
        target: newTarget,
        kind: 'spine' as const, // Ensure these survive "spine only" filtering
      };
    })
    .filter(e => e.source && e.target && e.source !== e.target);
  
  // Dedupe by ID just in case
  const seen = new Set<string>();
  const dedupedCheckpointEdges = remappedCheckpointEdges.filter(e => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
  
  if (import.meta.env.DEV) {
    console.log('[Collapsed View] Remapped checkpoint edges:', dedupedCheckpointEdges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      kind: e.kind
    })));
  }
  
  // Validate all checkpoint edges have valid endpoints
  if (import.meta.env.DEV) {
    const visibleIds = new Set(visibleNodes.map(n => n.id));
    const invalidEdges = dedupedCheckpointEdges.filter(e => 
      !visibleIds.has(e.source) || !visibleIds.has(e.target)
    );
    
    if (invalidEdges.length > 0) {
      console.error('[Collapsed View] Invalid checkpoint edges detected:', invalidEdges.map(e => ({
        id: e.id,
        source: e.source,
        sourceExists: visibleIds.has(e.source),
        target: e.target,
        targetExists: visibleIds.has(e.target)
      })));
    } else {
      console.log('[Collapsed View] ✅ All checkpoint edges valid');
    }
  }

  // Spine edges only (no raw prereq spaghetti)
  const idOf = (want: BundleId) =>
    visibleNodes.find((n) => n.id === want)?.id;

  const edges: V3Edge[] = [];
  
  // Add remapped checkpoint edges FIRST (before bundle edges)
  edges.push(...dedupedCheckpointEdges);
  
  const add = (source?: string, target?: string, kind: V3Edge["kind"] = "spine") => {
    if (!source || !target) return;
    edges.push({ id: `${source}->${target}`, source, target, kind });
  };

  // y1 -> programGate -> y2
  const y1 = idOf("y1-bundle");
  const y2 = idOf("y2-bundle");
  const programGate = gates.find((g) => g.data.year === 2)?.id; // gate-y2-programs
  add(y1, programGate, "gate");
  add(programGate, y2, "gate");

  // y2 -> trackGate -> y3-se / y3-ds
  const trackGate = gates.find((g) => g.data.year === 3)?.id; // gate-y3-tracks
  const y3se = idOf("y3-se-bundle");
  const y3ds = idOf("y3-ds-bundle");
  add(y2, trackGate, "gate");
  add(trackGate, y3se, "gate");
  add(trackGate, y3ds, "gate");

  // y3 -> y4
  const y4 = idOf("y4-bundle");
  add(y3se, y4, "spine");
  add(y3ds, y4, "spine");

  return { visibleNodes, visibleEdges: edges, bundles };
}

/** Expand a bundle: replace bundle node with its child requirement nodes */
export function expandBundle(
  bundleId: string,
  current: V3Graph,
  full: V3Graph,
  bundles: Map<string, BundleCard>
): V3Graph {
  const b = bundles.get(bundleId);
  if (!b) return current;

  const nodes = current.nodes.filter((n) => n.id !== bundleId);
  nodes.push(...full.nodes.filter((n) => b.childIds.includes(n.id)));

  const edges = [
    ...current.edges.filter((e) => e.source !== bundleId && e.target !== bundleId),
    ...full.edges.filter((e) => b.childIds.includes(e.source) || b.childIds.includes(e.target)),
  ];

  return { nodes, edges };
}

/** Collapse: remove children and re-add the bundle node */
export function collapseBundle(
  bundleId: string,
  current: V3Graph,
  bundles: Map<string, BundleCard>
): V3Graph {
  const b = bundles.get(bundleId);
  if (!b) return current;

  const nodes = current.nodes.filter((n) => !b.childIds.includes(n.id));
  nodes.push({
    id: b.id,
    type: "track-bundle",
    data: {
      year: b.year,
      trackId: b.trackId,
      title: b.title,
      childCount: b.childCount,
      totalCredits: b.totalCredits,
      isExpanded: false,
    },
    position: { x: 0, y: 0 },
  });

  const edges = current.edges.filter(
    (e) => !b.childIds.includes(e.source) && !b.childIds.includes(e.target)
  );

  return { nodes, edges };
}
