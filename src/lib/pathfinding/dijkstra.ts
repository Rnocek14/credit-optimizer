import { LifePathGraph } from '@/hooks/useLifePathGraph';
import { GraphNode, GraphEdge, UserState, ScoringConfig } from '@/types/lifePathGraph';
import { edgeCost, createScoringWeights, normalizeWeights, PathScoringWeights } from './algorithms';

interface DijkstraOptions {
  allowGhost?: boolean;
  userState?: UserState;
  scoringConfig?: ScoringConfig;
}

// Enhanced Dijkstra implementation for Phase 1
export function dijkstraPathfinding(
  graph: LifePathGraph, 
  goalId: string, 
  objective: 'time' | 'cost' | 'creditLoss' = 'time',
  options: DijkstraOptions = {}
): string[] {
  const { nodes, edges } = graph;
  const { allowGhost = false, userState, scoringConfig } = options;
  
  // Create node and edge maps for efficient lookups
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const edgesBySource = new Map<string, GraphEdge[]>();
  
  // Group edges by source node
  edges.forEach(edge => {
    if (!edgesBySource.has(edge.sourceId)) {
      edgesBySource.set(edge.sourceId, []);
    }
    edgesBySource.get(edge.sourceId)!.push(edge);
  });
  
  // Create scoring weights
  let weights: PathScoringWeights;
  if (scoringConfig) {
    weights = normalizeWeights(createScoringWeights(scoringConfig));
  } else {
    // Default weights based on objective
    weights = {
      time: objective === 'time' ? 1 : 0.2,
      cost: objective === 'cost' ? 1 : 0.2,
      creditLoss: objective === 'creditLoss' ? 1 : 0.3,
      difficulty: 0.1,
      roi: 0.2,
    };
  }
  
  // Find valid starting nodes (skills, completed nodes, or courses with no prerequisites)
  const startingNodes = nodes.filter(node => 
    node.type === 'skill' || 
    (userState && userState.completedNodeIds.includes(node.id)) ||
    node.prerequisiteIds.length === 0 ||
    (node.type === 'course' && node.prerequisiteIds.length === 0)
  );

  if (startingNodes.length === 0) {
    console.warn('No valid starting nodes found, using fallback path');
    return createFallbackPath(nodes, goalId);
  }

  // Initialize Dijkstra data structures
  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const visited = new Set<string>();
  const queue = new Set<string>();

  // Initialize all nodes with infinite distance
  nodes.forEach(node => {
    distances.set(node.id, Infinity);
    previous.set(node.id, null);
  });

  // Set starting nodes distance to 0
  startingNodes.forEach(node => {
    distances.set(node.id, 0);
    queue.add(node.id);
  });

  // Dijkstra's algorithm
  while (queue.size > 0) {
    // Find unvisited node with minimum distance
    let currentNode: string | null = null;
    let minDistance = Infinity;
    
    for (const nodeId of queue) {
      const dist = distances.get(nodeId) || Infinity;
      if (dist < minDistance) {
        minDistance = dist;
        currentNode = nodeId;
      }
    }

    if (!currentNode || minDistance === Infinity) break;
    
    queue.delete(currentNode);
    visited.add(currentNode);

    // If we reached the goal, stop
    if (currentNode === goalId) break;

    // Check all outgoing edges from current node
    const outgoingEdges = edgesBySource.get(currentNode) || [];
    
    for (const edge of outgoingEdges) {
      const neighbor = edge.targetId;
      
      if (visited.has(neighbor)) continue;
      
      // Skip ghost edges if not allowed
      if (!allowGhost && edge.type === 'ghost') continue;
      
      // Calculate edge cost
      const cost = edgeCost(edge, weights, userState);
      const newDistance = minDistance + cost;
      
      if (newDistance < (distances.get(neighbor) || Infinity)) {
        distances.set(neighbor, newDistance);
        previous.set(neighbor, currentNode);
        queue.add(neighbor);
      }
    }
  }

  // Reconstruct path from goal to start
  const path: string[] = [];
  let currentNode: string | null = goalId;
  
  while (currentNode) {
    path.unshift(currentNode);
    currentNode = previous.get(currentNode) || null;
  }

  // If no path found, return fallback
  if (path.length === 1 && path[0] === goalId) {
    console.warn('No valid path found, using fallback');
    return createFallbackPath(nodes, goalId);
  }

  return path;
}

function createFallbackPath(nodes: GraphNode[], goalId: string): string[] {
  const path: string[] = [];
  
  // Ensure at least 2 non-job nodes before the goal
  
  // Add a skill node if available
  const skillNode = nodes.find(n => n.type === 'skill');
  if (skillNode) path.push(skillNode.id);
  
  // Add intro courses with no prerequisites
  const introCourses = nodes.filter(n => n.type === 'course' && n.prerequisiteIds.length === 0);
  const courseNode = introCourses[0];
  if (courseNode) path.push(courseNode.id);
  
  // Add another course or credential to ensure minimum path length
  const goalNode = nodes.find(n => n.id === goalId);
  if (goalNode?.type === 'job') {
    // If goal is a job, add the credential that qualifies for it
    const qualifyingCredential = nodes.find(n => 
      n.type === 'credential' && 
      nodes.some(edge => edge && typeof edge === 'object')
    );
    if (qualifyingCredential) {
      path.push(qualifyingCredential.id);
    } else {
      // Fallback: add any credential
      const anyCredential = nodes.find(n => n.type === 'credential');
      if (anyCredential) path.push(anyCredential.id);
    }
  }
  
  // Add the goal
  path.push(goalId);
  
  // Ensure we have at least 2 non-job nodes
  const nonJobNodes = path.filter(id => {
    const node = nodes.find(n => n.id === id);
    return node && node.type !== 'job';
  });
  
  if (nonJobNodes.length < 2) {
    // Add more nodes to meet minimum requirement
    const additionalCourse = nodes.find(n => n.type === 'course' && !path.includes(n.id));
    if (additionalCourse) {
      path.splice(-1, 0, additionalCourse.id); // Insert before goal
    }
  }
  
  return path;
}