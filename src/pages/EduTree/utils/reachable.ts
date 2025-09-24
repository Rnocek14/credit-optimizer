/**
 * Reachability Utilities for Suffix Compare
 * Fast graph traversal with caching
 */

import { Edge } from '@xyflow/react';

type NodeId = string;
type AdjacencyMap = Map<NodeId, NodeId[]>;

// Cache for reachable sets
const reachableCache = new Map<string, Set<NodeId>>();
let cachedGraphVersion: string | null = null;

/**
 * Build forward adjacency map from edges
 */
export function buildAdjacency(edges: Edge[]): AdjacencyMap {
  const adjacency = new Map<NodeId, NodeId[]>();
  
  edges.forEach(edge => {
    if (!edge.source || !edge.target) return;
    
    const neighbors = adjacency.get(edge.source) || [];
    neighbors.push(edge.target);
    adjacency.set(edge.source, neighbors);
  });
  
  return adjacency;
}

/**
 * Get all nodes reachable from a starting checkpoint using BFS
 */
export function reachableAfter(
  startId: NodeId, 
  adjacency: AdjacencyMap,
  graphVersion?: string
): Set<NodeId> {
  // Cache key includes both startId and graph version
  const cacheKey = `${startId}-${graphVersion || 'default'}`;
  
  // Check cache if graph version matches
  if (graphVersion && graphVersion === cachedGraphVersion && reachableCache.has(cacheKey)) {
    return reachableCache.get(cacheKey)!;
  }
  
  // Clear cache if graph version changed
  if (graphVersion && graphVersion !== cachedGraphVersion) {
    reachableCache.clear();
    cachedGraphVersion = graphVersion;
  }
  
  const reachable = new Set<NodeId>();
  const queue: NodeId[] = [startId];
  const visited = new Set<NodeId>();
  
  // Include the starting checkpoint itself
  reachable.add(startId);
  visited.add(startId);
  
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const neighbors = adjacency.get(currentId) || [];
    
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        reachable.add(neighborId);
        queue.push(neighborId);
      }
    }
  }
  
  // Cache the result
  if (graphVersion) {
    reachableCache.set(cacheKey, reachable);
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[Reachable] Computed reachable set:', {
      startId,
      reachableCount: reachable.size,
      cached: graphVersion ? reachableCache.has(cacheKey) : false
    });
  }
  
  return reachable;
}

/**
 * Generate a stable graph version string for caching
 */
export function getGraphVersion(edges: Edge[]): string {
  return edges
    .map(e => `${e.source}->${e.target}`)
    .sort()
    .join('|');
}