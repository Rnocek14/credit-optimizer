import { V3Graph, V3Node } from '../types/v3';
import { LAYOUT_TOKENS } from '../utils/layoutTokensV3';
import { calculateLayout } from './layoutEngine';
import { computeRegions } from './regionManager';
import { resolveCollisions } from './collisionResolver';
import { validateNoOverlaps } from './overlapValidator';
import { injectCheckpoints } from './checkpointManager';
import type { BridgeMeta } from '../data/lifePathBridge';

export interface EnrichmentContext {
  marketplace?: any;
  userPlan?: any;
  enableCheckpoints?: boolean;
  meta?: BridgeMeta;
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
  // 0) Phase 3: Inject checkpoints if enabled and meta provided
  let workingGraph = graph;
  
  if (context?.enableCheckpoints && context?.meta && Object.keys(context.meta.alternativesByNode).length > 0) {
    const result = injectCheckpoints(graph.nodes, graph.edges, context.meta);
    workingGraph = { nodes: result.nodes, edges: result.edges };
    console.log(`[buildEduTreeGraph] Injected ${result.checkpointsAdded} checkpoint nodes`);
  }
  
  // 1) Enrich nodes with external data (if provided)
  const enrichedNodes = workingGraph.nodes.map(node => enrichNode(node, context));
  
  // 2) Calculate initial layout (year columns, track lanes)
  const positioned = calculateLayout(enrichedNodes, LAYOUT_TOKENS);
  
  // 3) Compute program regions and corridors
  const regions = computeRegions(positioned, LAYOUT_TOKENS);
  
  // 4) Resolve collisions within corridors
  const resolved = resolveCollisions(positioned, regions, LAYOUT_TOKENS);
  
  // 5) Validate (dev-time assertion)
  const validation = validateNoOverlaps(resolved, LAYOUT_TOKENS);
  
  if (validation.hasOverlaps && import.meta?.env?.DEV) {
    console.warn('[V3 buildGraph] Overlaps detected:', validation.overlaps.length);
    console.log('[V3 Overlap Diagnostics] Root cause analysis:');
    console.table(validation.diagnostics.slice(0, 10));
    
    // Summary of root causes
    const causes = {
      xDrift: validation.diagnostics.filter(d => d.xDrift).length,
      tooNarrowLanes: validation.diagnostics.filter(d => d.tooNarrowLanes).length,
      tooShortStepY: validation.diagnostics.filter(d => d.tooShortStepY).length,
      gateXNotCenter: validation.diagnostics.filter(d => d.gateXNotCenter).length,
      missingYearOrProgram: validation.diagnostics.filter(d => d.missingYearOrProgram).length
    };
    console.log('[V3 Root Causes]', causes);
  }
  
  return {
    nodes: resolved,
    edges: workingGraph.edges
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
  
  // 0) Phase 3: Inject checkpoints if enabled and meta provided
  let workingGraph = graph;
  
  if (context?.enableCheckpoints && context?.meta && Object.keys(context.meta.alternativesByNode).length > 0) {
    const result = injectCheckpoints(graph.nodes, graph.edges, context.meta);
    workingGraph = { nodes: result.nodes, edges: result.edges };
    console.log(`[buildEduTreeGraphWithMetrics] Injected ${result.checkpointsAdded} checkpoint nodes`);
  }
  
  const enrichStart = performance.now();
  const enrichedNodes = workingGraph.nodes.map(node => enrichNode(node, context));
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
    graph: { nodes: resolved, edges: workingGraph.edges },
    metrics: {
      nodeCount: workingGraph.nodes.length,
      edgeCount: workingGraph.edges.length,
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
