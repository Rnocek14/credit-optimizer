// src/pages/EduTree/v3/engine/createCollapsedView.ts
import type { V3Graph, V3Node, V3Edge } from "../types/v3";
import { creditFromNode, timeFromNode, costFromNode, countByType } from "./metrics";

// Type-safe mode enum to prevent string drift
export enum CollapsedMode {
  Year = 'year',
  Tier = 'tier'
}

export type TrackId = "se" | "ds";
export type BundleId =
  | "y1-bundle"
  | "y2-bundle"
  | "y3-se-bundle"
  | "y3-ds-bundle"
  | "y4-bundle"
  | `bundle:tier:${number}`; // Tier bundle IDs

// Precise bundle typing for memoization and rendering
export type Bundle = {
  id: BundleId;
  nodeIds: string[];
  meta: BundleCard;
};

export interface BundleCard {
  id: BundleId | string;
  year?: 1 | 2 | 3 | 4;
  tier?: number;
  trackId?: TrackId;
  title: string;
  childCount: number;
  totalCredits: number;
  childIds: string[];
  estimatedTime?: number;
  estimatedCost?: number;
  topItems?: Array<{ id: string; title: string; credits: number; provider: string }>;
  providers?: string[];
  typeCounts?: { courses: number; credentials: number; skills: number; jobs: number };
}

/**
 * Router: delegates to year-based or tier-based bundling
 * Ensures complete separation of bundling logic
 */
export function createCollapsedView(
  fullGraph: V3Graph,
  mode: CollapsedMode = CollapsedMode.Year
): {
  visibleNodes: V3Node[];
  visibleEdges: V3Edge[];
  bundles: Map<string, BundleCard>;
} {
  return mode === CollapsedMode.Tier
    ? createCollapsedViewTier(fullGraph)
    : createCollapsedViewYear(fullGraph);
}
  
/**
 * Year-based bundling (seed data)
 * Bundles nodes by academic year with track gates
 */
function createCollapsedViewYear(fullGraph: V3Graph): {
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
      childIds: b.childIds,
      estimatedTime: b.estimatedTime,
      estimatedCost: b.estimatedCost,
      topItems: b.topItems,
      providers: b.providers,
      typeCounts: b.typeCounts
    },
    position: { x: 0, y: 0 },
  });

  // Phase 1 Fix: Declare edges at top of function scope (BEFORE any usage)
  const edges: V3Edge[] = [];
  let visibleNodes: V3Node[] = [];
  
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

    // PRIORITY 1A & 1B: Type-aware aggregation using metrics utilities
    const totalCredits = kids.reduce((s, n) => s + creditFromNode(n), 0);
    const estimatedTime = kids.reduce((s, n) => s + timeFromNode(n), 0);
    const estimatedCost = kids.reduce((s, n) => s + costFromNode(n), 0);
    const typeCounts = countByType(kids);
    
    const topItems = kids.slice(0, 3).map(n => ({
      id: n.id,
      title: n.data.title ?? n.id,
      credits: creditFromNode(n),
      provider: n.data.provider ?? n.data.slug?.split(':')[0] ?? 'Unknown'
    }));
    
    const providers = Array.from(new Set(
      kids.map(n => n.data.provider ?? n.data.slug?.split(':')[0]).filter(Boolean)
    ));

    const card: BundleCard = {
      id,
      year,
      trackId,
      title,
      childCount: kids.length,
      totalCredits,
      childIds: kids.map((n) => n.id),
      estimatedTime,
      estimatedCost,
      topItems,
      providers,
      typeCounts
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

  // Phase 2 Fix: Filter out empty bundles before continuing
  visibleNodes = visibleNodes.filter(n => {
    if (n.type !== 'track-bundle') return true;
    const hasChildren = n.data.childCount > 0;
    if (!hasChildren && import.meta.env.DEV) {
      console.warn(`[Collapsed View] Filtered empty bundle: ${n.id}`);
    }
    return hasChildren;
  });

  // Phase 3 Fix: Include job gates (lpType === 'job') in addition to academic gates
  const academicGates = gates.filter(g => {
    const hasYear = typeof g.data.year === 'number' && g.data.year >= 1 && g.data.year <= 4;
    const isAcademicGate = g.data.programId !== 'lifepath' || hasYear;
    const isJobGate = g.data.lpType === 'job';
    return isAcademicGate || isJobGate;
  });

  if (import.meta.env.DEV) {
    const filtered = gates.filter(g => !academicGates.includes(g));
    if (filtered.length > 0) {
      console.warn('[Collapsed View] Filtered non-academic gates:', filtered.map(g => ({
        id: g.id,
        year: g.data.year,
        programId: g.data.programId,
        title: g.data.title
      })));
    }
  }

  // Always include academic gates and checkpoints (with validation)
  console.log('[Collapsed View] Adding gates to visible nodes:', academicGates.map(g => ({ id: g.id, hasYear: !!g.data?.year })));
  console.log('[Collapsed View] Adding checkpoints to visible nodes:', checkpoints.map(c => ({ id: c.id, sourceNodeId: c.data?.sourceNodeId })));
  visibleNodes.push(...academicGates);
  visibleNodes.push(...checkpoints);

  // FIX #1: WHITELIST - Only allow collapsed-mode node types
  const ALLOWED_TYPES = new Set(['track-bundle', 'gate', 'checkpoint']);
  visibleNodes = visibleNodes.filter(n => ALLOWED_TYPES.has(n.type));

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
      
      // Create spine edge: bundle → checkpoint (AFTER remapping)
      visibleNodes.filter(n => n.type === 'track-bundle' && n.id === bundleId).forEach(bundle => {
        const edgeId = `${bundleId}-to-${cp.id}`;
        if (!edges.some(e => e.id === edgeId)) {
          edges.push({
            id: edgeId,
            source: bundleId,
            target: cp.id,
            kind: 'spine',
            data: { isCheckpointEdge: true, forceSpineStyle: true }
          });
          
          if (import.meta.env.DEV) {
            console.log('[Collapsed View] Created checkpoint edge after remap:', {
              id: edgeId,
              source: bundleId,
              target: cp.id
            });
          }
        }
      });
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
        kind: 'spine' as const,
        data: {
          ...(e.data || {}),
          isCheckpointEdge: true,
          forceSpineStyle: true
        }
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

  // Phase 1 Fix: edges already declared at top of function (line 95)
  // Add remapped checkpoint edges FIRST (before bundle edges)
  edges.push(...dedupedCheckpointEdges);
  
  const add = (source?: string, target?: string, kind: V3Edge["kind"] = "spine") => {
    if (!source || !target) return;
    edges.push({ id: `${source}->${target}`, source, target, kind });
  };

  // y1 -> programGate -> y2 (with fallback to first available gate)
  const y1 = idOf("y1-bundle");
  const y2 = idOf("y2-bundle");
  const programGate = academicGates.find((g) => g.data.year === 2)?.id || academicGates[0]?.id;
  const trackGate = academicGates.find((g) => g.data.year === 3)?.id || academicGates[1]?.id;
  
  if (programGate) {
    add(y1, programGate, "gate");
    add(programGate, y2, "gate");
  }

  // y2 -> trackGate -> y3-se / y3-ds
  const y3se = idOf("y3-se-bundle");
  const y3ds = idOf("y3-ds-bundle");
  
  if (trackGate) {
    add(y2, trackGate, "gate");
    add(trackGate, y3se, "gate");
    add(trackGate, y3ds, "gate");
  }

  // y3 -> y4
  const y4 = idOf("y4-bundle");
  add(y3se, y4, "spine");
  add(y3ds, y4, "spine");

  // FIX #4: Final edge merge - ensure checkpoint edges survive
  const visibleIds = new Set(visibleNodes.map(n => n.id));

  // Rebuild checkpoint edges from full graph one more time
  const finalCkptEdges = checkpointEdgesRaw
    .map(e => {
      const src = childToBundle.get(e.source) ?? e.source;
      const tgt = childToBundle.get(e.target) ?? e.target;
      return {
        ...e,
        id: `ckpt:${src}->${tgt}`,
        source: src,
        target: tgt,
        kind: 'spine' as const,
        data: { ...(e.data||{}), isCheckpointEdge: true, forceSpineStyle: true }
      };
    })
    .filter(e => visibleIds.has(e.source) && visibleIds.has(e.target) && e.source !== e.target);

  // Dedupe: merge checkpoint edges with spine edges by ID
  const edgeById = new Map(edges.map(e => [e.id, e]));
  for (const e of finalCkptEdges) {
    edgeById.set(e.id, e);
  }
  const finalEdges = Array.from(edgeById.values());

  // Phase 6: Comprehensive diagnostic logging
  if (import.meta.env.DEV) {
    console.log('[Collapsed View] Final edge merge:', {
      spineEdges: edges.length,
      checkpointEdgesAdded: finalCkptEdges.length,
      totalAfterMerge: finalEdges.length,
      checkpointEdgeIds: finalCkptEdges.map(e => e.id)
    });
    
    console.log('[Collapsed View] Final spine edges:', {
      total: finalEdges.length,
      checkpointEdges: finalEdges.filter(e => e.id.startsWith('ckpt:')).length,
      gateEdges: finalEdges.filter(e => e.kind === 'gate').length,
      spineEdges: finalEdges.filter(e => e.kind === 'spine').length,
      edgeBreakdown: finalEdges.map(e => ({ id: e.id, kind: e.kind, isCheckpoint: !!(e.data as any)?.isCheckpointEdge }))
    });

    console.log('[Collapsed View] Final graph summary:', {
      visibleNodes: visibleNodes.length,
      bundles: visibleNodes.filter(n => n.type === 'track-bundle').length,
      checkpoints: visibleNodes.filter(n => n.type === 'checkpoint').length,
      gates: visibleNodes.filter(n => n.type === 'gate').length,
      jobGates: visibleNodes.filter(n => n.type === 'gate' && n.data?.lpType === 'job').length,
      edges: finalEdges.length,
      emptyBundleCheck: visibleNodes.filter(n => n.type === 'track-bundle' && n.data.childCount === 0).length
    });

    // Verify no orphan edges
    const nodeIds = new Set(visibleNodes.map(n => n.id));
    const orphanEdges = finalEdges.filter(e => !nodeIds.has(e.source) || !nodeIds.has(e.target));
    if (orphanEdges.length > 0) {
      console.error('[Collapsed View] ⚠️ Orphan edges detected:', orphanEdges.map(e => ({
        id: e.id,
        source: e.source,
        sourceExists: nodeIds.has(e.source),
        target: e.target,
        targetExists: nodeIds.has(e.target)
      })));
    } else {
      console.log('[Collapsed View] ✅ No orphan edges');
    }
  }

  return { visibleNodes, visibleEdges: finalEdges, bundles };
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

/**
 * Tier-based bundling (LifePath data)
 * Bundles nodes by tier with linear progression (no track gates)
 */
function createCollapsedViewTier(fullGraph: V3Graph): {
  visibleNodes: V3Node[];
  visibleEdges: V3Edge[];
  bundles: Map<string, BundleCard>;
} {
  const byTier = new Map<number, V3Node[]>();
  const gates: V3Node[] = [];
  const checkpoints: V3Node[] = [];

  // Group nodes by tier
  for (const n of fullGraph.nodes) {
    if (n.type === 'gate') {
      gates.push(n);
      continue;
    }
    if (n.type === 'checkpoint') {
      checkpoints.push(n);
      continue;
    }
    const rawTier = n.data?.tier ?? 0;
    const tier = typeof rawTier === 'string' ? parseInt(rawTier, 10) : rawTier;
    const safeTier = Number.isFinite(tier) ? tier : 0;
    if (!byTier.has(safeTier)) byTier.set(safeTier, []);
    byTier.get(safeTier)!.push(n);
  }

  // Create tier bundles
  const bundles = new Map<string, BundleCard>();
  const visibleNodes: V3Node[] = [];

  for (const [tier, children] of byTier.entries()) {
    if (children.length === 0) continue;

    const bundleId = `tier-${tier}-bundle`;
    
    // PRIORITY 1A & 1B: Type-aware aggregation using metrics utilities
    const totalCredits = children.reduce((s, n) => s + creditFromNode(n), 0);
    const estimatedTime = children.reduce((s, n) => s + timeFromNode(n), 0);
    const estimatedCost = children.reduce((s, n) => s + costFromNode(n), 0);
    const typeCounts = countByType(children);
    
    // Top 3 items for preview
    const topItems = children.slice(0, 3).map(n => ({
      id: n.id,
      title: n.data.title ?? n.id,
      credits: creditFromNode(n),
      provider: n.data.provider ?? n.data.slug?.split(':')[0] ?? 'Unknown'
    }));
    
    // Unique providers
    const providers = Array.from(new Set(
      children.map(n => n.data.provider ?? n.data.slug?.split(':')[0]).filter(Boolean)
    ));
    
    const card: BundleCard = {
      id: bundleId,
      year: Math.min(tier + 1, 4) as 1|2|3|4,
      title: children[0]?.data?.tierLabel || `Tier ${tier}`,
      childCount: children.length,
      totalCredits,
      childIds: children.map(n => n.id),
      estimatedTime,
      estimatedCost,
      topItems,
      providers,
      typeCounts
    };

    bundles.set(bundleId, card);
    visibleNodes.push({
      id: bundleId,
      type: 'track-bundle',
      data: {
        year: card.year,
        title: card.title,
        childCount: card.childCount,
        totalCredits: card.totalCredits,
        isExpanded: false,
        tier,
        trackId: undefined,
        programId: 'lifepath',
        lpType: 'tier-bundle',
        childIds: card.childIds,
        estimatedTime: card.estimatedTime,
        estimatedCost: card.estimatedCost,
        topItems: card.topItems,
        providers: card.providers
      },
      position: { x: 0, y: 0 }
    });
  }

  // Add gates and checkpoints
  visibleNodes.push(...gates, ...checkpoints);

  // Remap checkpoint sourceNodeId (child → bundle)
  const childToBundle = new Map<string, string>();
  for (const [bundleId, bundle] of bundles.entries()) {
    for (const childId of bundle.childIds) {
      childToBundle.set(childId, bundleId);
    }
  }

  checkpoints.forEach(cp => {
    const rawSourceId = cp.data?.sourceNodeId;
    if (rawSourceId) {
      const bundleId = childToBundle.get(rawSourceId);
      if (bundleId) {
        if (import.meta.env.DEV) {
          console.log('[Tier Bundles] Remapping checkpoint source:', {
            checkpointId: cp.id,
            rawSource: rawSourceId,
            bundleTarget: bundleId
          });
        }
        cp.data = { ...cp.data, sourceNodeId: bundleId };
      }
    }
  });

  // Create spine edges between tiers
  const sortedTiers = Array.from(byTier.keys()).sort((a, b) => a - b);
  const edges: V3Edge[] = [];

  for (let i = 0; i < sortedTiers.length - 1; i++) {
    const currTier = sortedTiers[i];
    const nextTier = sortedTiers[i + 1];
    edges.push({
      id: `tier-${currTier}->tier-${nextTier}`,
      source: `tier-${currTier}-bundle`,
      target: `tier-${nextTier}-bundle`,
      kind: 'spine'
    });
  }

  // Add checkpoint edges (remapped)
  const checkpointIds = new Set(checkpoints.map(c => c.id));
  const checkpointEdges = fullGraph.edges
    .filter(e => checkpointIds.has(e.source) || checkpointIds.has(e.target))
    .map(e => ({
      ...e,
      id: `ckpt:${childToBundle.get(e.source) ?? e.source}->${childToBundle.get(e.target) ?? e.target}`,
      source: childToBundle.get(e.source) ?? e.source,
      target: childToBundle.get(e.target) ?? e.target,
      kind: 'spine' as const,
      data: { ...(e.data||{}), isCheckpointEdge: true }
    }))
    .filter(e => e.source !== e.target);

  edges.push(...checkpointEdges);

  if (import.meta.env.DEV) {
    console.log('[Tier Bundles] Created tier bundles:', {
      bundleCount: bundles.size,
      tiers: Array.from(byTier.keys()).sort((a, b) => a - b),
      checkpointCount: checkpoints.length,
      edgeCount: edges.length
    });
  }

  return { visibleNodes, visibleEdges: edges, bundles };
}
