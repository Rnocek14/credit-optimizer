import { PathResult, GraphNode, GraphEdge } from '@/types/lifePathGraph';

export interface SharedSubgraph {
  sharedNodes: string[];
  sharedEdges: string[];
  bridgeNodes: string[]; // Nodes that connect shared segments
  segments: SharedSegment[];
}

export interface SharedSegment {
  nodeIds: string[];
  startIndex: { [pathId: string]: number };
  endIndex: { [pathId: string]: number };
  description: string;
  metrics: {
    totalTime: number;
    totalCost: number;
    totalCredits: number;
  };
}

export interface MergedPath {
  id: string;
  name: string;
  paths: PathResult[];
  mergedNodeIds: string[];
  sharedSubgraph: SharedSubgraph;
  uniqueSegments: { [pathId: string]: string[] };
  comparisonMetrics: {
    sharedPercentage: number;
    divergencePoints: string[];
    convergencePoints: string[];
  };
}

/**
 * Merge shared subgraphs from multiple paths to avoid duplication in comparison view
 */
export function mergeSharedSubgraph(pathA: PathResult, pathB: PathResult): MergedPath {
  const sharedNodes = findSharedNodes(pathA.nodeIds, pathB.nodeIds);
  const sharedSegments = findSharedSegments(pathA.nodeIds, pathB.nodeIds);
  const bridgeNodes = findBridgeNodes(pathA.nodeIds, pathB.nodeIds, sharedNodes);
  
  // Create merged node sequence with shared nodes appearing once
  const mergedNodeIds = createMergedSequence(pathA.nodeIds, pathB.nodeIds, sharedNodes);
  
  const sharedSubgraph: SharedSubgraph = {
    sharedNodes,
    sharedEdges: createSharedEdges(sharedNodes),
    bridgeNodes,
    segments: sharedSegments
  };

  const divergencePoints = findDivergencePoints(pathA.nodeIds, pathB.nodeIds);
  const convergencePoints = findConvergencePoints(pathA.nodeIds, pathB.nodeIds);
  
  return {
    id: `merged-${pathA.id}-${pathB.id}`,
    name: `Comparison: ${pathA.name} vs ${pathB.name}`,
    paths: [pathA, pathB],
    mergedNodeIds,
    sharedSubgraph,
    uniqueSegments: {
      [pathA.id]: pathA.nodeIds.filter(id => !sharedNodes.includes(id)),
      [pathB.id]: pathB.nodeIds.filter(id => !sharedNodes.includes(id))
    },
    comparisonMetrics: {
      sharedPercentage: (sharedNodes.length / Math.max(pathA.nodeIds.length, pathB.nodeIds.length)) * 100,
      divergencePoints,
      convergencePoints
    }
  };
}

/**
 * Find nodes that appear in both paths
 */
function findSharedNodes(pathA: string[], pathB: string[]): string[] {
  return pathA.filter(nodeId => pathB.includes(nodeId));
}

/**
 * Find consecutive shared segments between paths
 */
function findSharedSegments(pathA: string[], pathB: string[]): SharedSegment[] {
  const segments: SharedSegment[] = [];
  const sharedNodes = findSharedNodes(pathA, pathB);
  
  // Group consecutive shared nodes into segments
  let currentSegment: string[] = [];
  let segmentStartA = -1;
  let segmentStartB = -1;
  
  for (let i = 0; i < pathA.length; i++) {
    const nodeId = pathA[i];
    const isShared = sharedNodes.includes(nodeId);
    const indexInB = pathB.indexOf(nodeId);
    
    if (isShared && indexInB !== -1) {
      if (currentSegment.length === 0) {
        segmentStartA = i;
        segmentStartB = indexInB;
      }
      currentSegment.push(nodeId);
    } else if (currentSegment.length > 0) {
      // End of segment
      if (currentSegment.length >= 2) {
        segments.push({
          nodeIds: currentSegment,
          startIndex: { [pathA.join('-')]: segmentStartA, [pathB.join('-')]: segmentStartB },
          endIndex: { [pathA.join('-')]: i - 1, [pathB.join('-')]: segmentStartB + currentSegment.length - 1 },
          description: `Shared foundation (${currentSegment.length} steps)`,
          metrics: {
            totalTime: currentSegment.length * 4, // Estimate
            totalCost: currentSegment.length * 1500, // Estimate
            totalCredits: currentSegment.length * 3 // Estimate
          }
        });
      }
      currentSegment = [];
    }
  }
  
  // Handle final segment
  if (currentSegment.length >= 2) {
    segments.push({
      nodeIds: currentSegment,
      startIndex: { [pathA.join('-')]: segmentStartA, [pathB.join('-')]: segmentStartB },
      endIndex: { [pathA.join('-')]: pathA.length - 1, [pathB.join('-')]: segmentStartB + currentSegment.length - 1 },
      description: `Shared foundation (${currentSegment.length} steps)`,
      metrics: {
        totalTime: currentSegment.length * 4,
        totalCost: currentSegment.length * 1500,
        totalCredits: currentSegment.length * 3
      }
    });
  }
  
  return segments;
}

/**
 * Find bridge nodes that connect shared segments to unique path sections
 */
function findBridgeNodes(pathA: string[], pathB: string[], sharedNodes: string[]): string[] {
  const bridges: string[] = [];
  
  // Find nodes that are adjacent to shared nodes but not shared themselves
  [...pathA, ...pathB].forEach((nodeId, index, path) => {
    if (sharedNodes.includes(nodeId)) return;
    
    const hasSharedNeighbor = [
      path[index - 1],
      path[index + 1]
    ].some(neighbor => neighbor && sharedNodes.includes(neighbor));
    
    if (hasSharedNeighbor && !bridges.includes(nodeId)) {
      bridges.push(nodeId);
    }
  });
  
  return bridges;
}

/**
 * Create shared edges between consecutive shared nodes
 */
function createSharedEdges(sharedNodes: string[]): string[] {
  const edges: string[] = [];
  
  for (let i = 0; i < sharedNodes.length - 1; i++) {
    edges.push(`${sharedNodes[i]}->${sharedNodes[i + 1]}`);
  }
  
  return edges;
}

/**
 * Create merged node sequence with shared nodes appearing once
 */
function createMergedSequence(pathA: string[], pathB: string[], sharedNodes: string[]): string[] {
  const merged: string[] = [];
  const processed = new Set<string>();
  
  // Use pathA as the base sequence
  for (let i = 0; i < pathA.length; i++) {
    const nodeId = pathA[i];
    
    if (!processed.has(nodeId)) {
      merged.push(nodeId);
      processed.add(nodeId);
    }
  }
  
  // Add unique nodes from pathB
  for (const nodeId of pathB) {
    if (!processed.has(nodeId)) {
      merged.push(nodeId);
      processed.add(nodeId);
    }
  }
  
  return merged;
}

/**
 * Find points where paths diverge (have different next nodes after a shared node)
 */
function findDivergencePoints(pathA: string[], pathB: string[]): string[] {
  const divergences: string[] = [];
  
  for (let i = 0; i < pathA.length - 1; i++) {
    const currentNode = pathA[i];
    const nextNodeA = pathA[i + 1];
    const currentIndexB = pathB.indexOf(currentNode);
    
    if (currentIndexB !== -1 && currentIndexB < pathB.length - 1) {
      const nextNodeB = pathB[currentIndexB + 1];
      
      if (nextNodeA !== nextNodeB) {
        divergences.push(currentNode);
      }
    }
  }
  
  return divergences;
}

/**
 * Find points where paths converge (reach the same node after different sequences)
 */
function findConvergencePoints(pathA: string[], pathB: string[]): string[] {
  const convergences: string[] = [];
  const sharedNodes = findSharedNodes(pathA, pathB);
  
  for (const nodeId of sharedNodes) {
    const indexA = pathA.indexOf(nodeId);
    const indexB = pathB.indexOf(nodeId);
    
    // Check if the previous nodes are different (indicating convergence)
    if (indexA > 0 && indexB > 0) {
      const prevNodeA = pathA[indexA - 1];
      const prevNodeB = pathB[indexB - 1];
      
      if (prevNodeA !== prevNodeB) {
        convergences.push(nodeId);
      }
    }
  }
  
  return convergences;
}

/**
 * Calculate comparison metrics for multiple paths
 */
export function calculateComparisonMetrics(paths: PathResult[]): {
  totalSharedNodes: number;
  avgSharedPercentage: number;
  mostCommonNodes: { nodeId: string; frequency: number }[];
  pathSimilarity: { [key: string]: number };
} {
  if (paths.length < 2) {
    return {
      totalSharedNodes: 0,
      avgSharedPercentage: 0,
      mostCommonNodes: [],
      pathSimilarity: {}
    };
  }

  // Count node frequencies across all paths
  const nodeFrequency: { [nodeId: string]: number } = {};
  paths.forEach(path => {
    path.nodeIds.forEach(nodeId => {
      nodeFrequency[nodeId] = (nodeFrequency[nodeId] || 0) + 1;
    });
  });

  const sharedNodes = Object.entries(nodeFrequency)
    .filter(([_, freq]) => freq > 1)
    .map(([nodeId]) => nodeId);

  const mostCommonNodes = Object.entries(nodeFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([nodeId, frequency]) => ({ nodeId, frequency }));

  // Calculate average shared percentage
  const sharedPercentages: number[] = [];
  for (let i = 0; i < paths.length - 1; i++) {
    for (let j = i + 1; j < paths.length; j++) {
      const shared = findSharedNodes(paths[i].nodeIds, paths[j].nodeIds);
      const percentage = (shared.length / Math.max(paths[i].nodeIds.length, paths[j].nodeIds.length)) * 100;
      sharedPercentages.push(percentage);
    }
  }

  const avgSharedPercentage = sharedPercentages.length > 0 
    ? sharedPercentages.reduce((a, b) => a + b) / sharedPercentages.length 
    : 0;

  // Calculate pairwise similarity
  const pathSimilarity: { [key: string]: number } = {};
  for (let i = 0; i < paths.length - 1; i++) {
    for (let j = i + 1; j < paths.length; j++) {
      const key = `${paths[i].id}-${paths[j].id}`;
      const shared = findSharedNodes(paths[i].nodeIds, paths[j].nodeIds);
      const similarity = (shared.length / Math.max(paths[i].nodeIds.length, paths[j].nodeIds.length)) * 100;
      pathSimilarity[key] = similarity;
    }
  }

  return {
    totalSharedNodes: sharedNodes.length,
    avgSharedPercentage,
    mostCommonNodes,
    pathSimilarity
  };
}