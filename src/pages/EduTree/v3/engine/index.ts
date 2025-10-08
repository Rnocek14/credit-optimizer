import { V3Graph, V3Node } from '../types/v3';
import { LAYOUT_TOKENS } from '../utils/layoutTokensV3';
import { calculateLayout } from './layoutEngine';
import { computeRegions } from './regionManager';
import { resolveCollisions } from './collisionResolver';
import { validateNoOverlaps } from './overlapValidator';
import { injectCheckpoints } from './checkpointManager';
import type { BridgeMeta } from '../data/lifePathBridge';

export function buildGraph(
  graph: V3Graph, 
  meta?: BridgeMeta,
  options?: { enableCheckpoints?: boolean }
): V3Graph {
  // 0) Phase 3: Inject checkpoints if meta provided and flag enabled
  let workingNodes = graph.nodes;
  let workingEdges = graph.edges;
  
  const shouldInjectCheckpoints = 
    options?.enableCheckpoints && 
    meta && 
    Object.keys(meta.alternativesByNode).length > 0;
  
  if (shouldInjectCheckpoints) {
    const result = injectCheckpoints(graph.nodes, graph.edges, meta!);
    workingNodes = result.nodes;
    workingEdges = result.edges;
    console.log(`[V3 Engine] Injected ${result.checkpointsAdded} checkpoint nodes`);
  }

  // 1) place nodes
  const positioned: V3Node[] = calculateLayout(workingNodes, LAYOUT_TOKENS);

  // 2) region bounds (program/track corridors)
  const regions = computeRegions(positioned, LAYOUT_TOKENS);

  // 3) resolve collisions (column + region aware)
  const resolved = resolveCollisions(positioned, regions, LAYOUT_TOKENS);

  // 4) validate (dev-time assert)
  const result = validateNoOverlaps(resolved, LAYOUT_TOKENS);
  if (result.hasOverlaps && import.meta?.env?.DEV) {
    console.warn('[V3] Overlaps detected:', result.overlaps.slice(0, 10));
  }

  // Expose validator globally in dev
  if (import.meta?.env?.DEV) {
    (window as any).__lpV3 = { 
      ...(window as any).__lpV3, 
      validateNoOverlaps: () => validateNoOverlaps(resolved, LAYOUT_TOKENS) 
    };
  }

  return { nodes: resolved, edges: workingEdges };
}
