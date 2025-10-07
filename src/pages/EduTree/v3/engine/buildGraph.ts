import { V3Graph, V3Node } from '../types/v3';
import { LAYOUT_TOKENS } from '../utils/layoutTokensV3';
import { calculateLayout } from './layoutEngine';
import { computeRegions } from './regionManager';
import { resolveCollisions } from './collisionResolver';
import { validateNoOverlaps } from './overlapValidator';

export interface EnrichmentContext {
  marketplace?: any;
  userPlan?: any;
}

/**
 * Main graph builder - orchestrates V3 layout pipeline
 * 
 * @param graph - Base V3 graph (from adapter or manual construction)
 * @param context - Optional enrichment data (marketplace, user plan, etc.)
 * @returns Fully positioned V3 graph ready for rendering
 */
export function buildEduTreeGraph(
  graph: V3Graph,
  context?: EnrichmentContext
): V3Graph {
  // 1) Enrich nodes with external data (if provided)
  const enrichedNodes = graph.nodes.map(node => enrichNode(node, context));
  
  // 2) Calculate initial layout (year columns, track lanes)
  const positioned = calculateLayout(enrichedNodes, LAYOUT_TOKENS);
  
  // 3) Compute program regions and corridors
  const regions = computeRegions(positioned, LAYOUT_TOKENS);
  
  // 4) Resolve collisions within corridors
  const resolved = resolveCollisions(positioned, regions, LAYOUT_TOKENS);
  
  // 5) Validate (dev-time assertion)
  const validation = validateNoOverlaps(resolved, LAYOUT_TOKENS);
  
  if (validation.hasOverlaps && import.meta?.env?.DEV) {
    console.warn('[V3 buildGraph] Overlaps detected:', validation.overlaps.slice(0, 10));
    
    // Log detailed collision info for debugging
    console.table(validation.overlaps.slice(0, 5).map(({ a, b }) => {
      const nodeA = resolved.find(n => n.id === a)!;
      const nodeB = resolved.find(n => n.id === b)!;
      return {
        pair: `${a} vs ${b}`,
        Ax: `${nodeA.position.x}-${nodeA.position.x + LAYOUT_TOKENS.NODE_WIDTH}`,
        Ay: `${nodeA.position.y}-${nodeA.position.y + LAYOUT_TOKENS.NODE_MAX_HEIGHT}`,
        Bx: `${nodeB.position.x}-${nodeB.position.x + LAYOUT_TOKENS.NODE_WIDTH}`,
        By: `${nodeB.position.y}-${nodeB.position.y + LAYOUT_TOKENS.NODE_MAX_HEIGHT}`
      };
    }));
  }
  
  return {
    nodes: resolved,
    edges: graph.edges
  };
}

/**
 * Enriches a node with external data (marketplace options, user selections, etc.)
 * Single-pass enrichment - no mutations, returns new node
 */
export function enrichNode(node: V3Node, context?: EnrichmentContext): V3Node {
  if (!context) return node;
  
  // Placeholder for enrichment logic
  // In real implementation, this would:
  // - Look up marketplace options by node ID
  // - Check user plan for selected courses
  // - Add course counts, credit info, etc.
  
  return {
    ...node,
    data: {
      ...node.data,
      // Future enrichment fields will go here
    }
  };
}

/**
 * Performance instrumentation for layout pipeline
 */
export function buildEduTreeGraphWithMetrics(
  graph: V3Graph,
  context?: EnrichmentContext
): { graph: V3Graph; metrics: LayoutMetrics } {
  const startTotal = performance.now();
  
  const enrichStart = performance.now();
  const enrichedNodes = graph.nodes.map(node => enrichNode(node, context));
  const enrichDuration = performance.now() - enrichStart;
  
  const layoutStart = performance.now();
  const positioned = calculateLayout(enrichedNodes, LAYOUT_TOKENS);
  const layoutDuration = performance.now() - layoutStart;
  
  const regionStart = performance.now();
  const regions = computeRegions(positioned, LAYOUT_TOKENS);
  const regionDuration = performance.now() - regionStart;
  
  const collisionStart = performance.now();
  const resolved = resolveCollisions(positioned, regions, LAYOUT_TOKENS);
  const collisionDuration = performance.now() - collisionStart;
  
  const validateStart = performance.now();
  const validation = validateNoOverlaps(resolved, LAYOUT_TOKENS);
  const validateDuration = performance.now() - validateStart;
  
  const totalDuration = performance.now() - startTotal;
  
  return {
    graph: { nodes: resolved, edges: graph.edges },
    metrics: {
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      enrichDuration,
      layoutDuration,
      regionDuration,
      collisionDuration,
      validateDuration,
      totalDuration,
      hasOverlaps: validation.hasOverlaps,
      overlapCount: validation.overlaps.length
    }
  };
}

export interface LayoutMetrics {
  nodeCount: number;
  edgeCount: number;
  enrichDuration: number;
  layoutDuration: number;
  regionDuration: number;
  collisionDuration: number;
  validateDuration: number;
  totalDuration: number;
  hasOverlaps: boolean;
  overlapCount: number;
}
