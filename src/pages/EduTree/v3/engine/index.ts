import { V3Graph, V3Node } from '../types/v3';
import { LAYOUT_TOKENS } from '../utils/layoutTokensV3';
import { calculateLayout } from './layoutEngine';
import { computeRegions } from './regionManager';
import { resolveCollisions } from './collisionResolver';
import { validateNoOverlaps } from './overlapValidator';

export function buildGraph(graph: V3Graph): V3Graph {
  // 1) place nodes
  const positioned: V3Node[] = calculateLayout(graph.nodes, LAYOUT_TOKENS);

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

  return { nodes: resolved, edges: graph.edges };
}
