// Calm Skill Tree: Progressive Disclosure Engine
// Builds focused subgraphs to reduce visual complexity

// Define calm-specific types based on the actual data structure
export interface CalmGraphNode {
  id: string;
  type: string;
  title: string;
  description?: string;
  category?: string | null;
  position?: { x: number; y: number };
  market_demand_score?: number;
  data?: any;
}

export interface CalmGraphEdge {
  id: string;
  source: string;
  target: string;
  from_id: string;
  to_id: string;
  edge_type: string;
  type?: string;
}

export interface CalmConfig {
  maxVisibleNodes: number;
  maxVisibleEdges: number;
  defaultDepth: number;
  enableClustering: boolean;
  laneOrdering: string[];
}

export interface ClusterNode {
  id: string;
  type: 'cluster';
  lane: string;
  count: number;
  title: string;
  position: { x: number; y: number };
  data: {
    title: string;
    hiddenNodes: CalmGraphNode[];
    category: string;
    'data-testid': string;
    'data-node-type': string;
    'data-node-id': string;
  };
  style: any;
}

export interface CalmSubgraph {
  nodes: (CalmGraphNode | ClusterNode)[];
  edges: CalmGraphEdge[];
  clusters: ClusterNode[];
  hiddenNodes: CalmGraphNode[];
  hiddenEdges: CalmGraphEdge[];
  metadata: {
    visibleNodes: number;
    visibleEdges: number;
    clusterCount: number;
    totalHidden: number;
    performance: {
      buildTime: number;
    };
  };
}

const DEFAULT_CALM_CONFIG: CalmConfig = {
  maxVisibleNodes: 48,
  maxVisibleEdges: 200,
  defaultDepth: 3,
  enableClustering: true,
  laneOrdering: ['foundations', 'skills', 'projects', 'credentials', 'jobs']
};

// Lane positioning constants
const LANE_WIDTH = 320;
const LANE_GAP = 80;
const NODE_Y_GAP = 120;
const NODES_PER_ROW = 4;

export function buildCalmSubgraph(
  allNodes: CalmGraphNode[],
  allEdges: CalmGraphEdge[],
  options: {
    activeGoalId?: string;
    focusNodeId?: string;
    expandedClusters?: Set<string>;
    config?: Partial<CalmConfig>;
  } = {}
): CalmSubgraph {
  const startTime = performance.now();
  const config = { ...DEFAULT_CALM_CONFIG, ...options.config };
  const { activeGoalId, focusNodeId, expandedClusters = new Set() } = options;

  console.log('🔨 Building calm subgraph', {
    totalNodes: allNodes.length,
    totalEdges: allEdges.length,
    activeGoalId,
    focusNodeId,
    expandedClusters: Array.from(expandedClusters)
  });

  // Step 1: If focus mode, show only neighborhood
  if (focusNodeId) {
    return buildFocusSubgraph(allNodes, allEdges, focusNodeId, config);
  }

  // Step 2: Build goal path if active goal exists
  let coreNodes = new Set<string>();
  if (activeGoalId) {
    const goalPath = findGoalPath(allNodes, allEdges, activeGoalId);
    goalPath.forEach(nodeId => coreNodes.add(nodeId));
    
    // Add 1-hop neighbors to goal path
    goalPath.forEach(nodeId => {
      const neighbors = getNodeNeighbors(allNodes, allEdges, nodeId, 1);
      neighbors.forEach(neighborId => coreNodes.add(neighborId));
    });
  }

  // Step 3: If no goal, show representative nodes from each lane
  if (coreNodes.size === 0) {
    coreNodes = selectRepresentativeNodes(allNodes, config);
  }

  // Step 4: Build lane-based layout
  const { visibleNodes, clusters } = buildLaneLayout(
    allNodes, 
    Array.from(coreNodes), 
    expandedClusters,
    config
  );

  // Step 5: Filter edges to visible nodes only
  const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
  const visibleEdges = allEdges.filter(edge => 
    visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
  ).slice(0, config.maxVisibleEdges);

  const hiddenNodes = allNodes.filter(n => !visibleNodeIds.has(n.id));
  const hiddenEdges = allEdges.filter(edge => 
    !visibleEdges.some(ve => ve.id === edge.id)
  );

  const buildTime = performance.now() - startTime;

  const result: CalmSubgraph = {
    nodes: [...visibleNodes, ...clusters],
    edges: visibleEdges,
    clusters,
    hiddenNodes,
    hiddenEdges,
    metadata: {
      visibleNodes: visibleNodes.length,
      visibleEdges: visibleEdges.length,
      clusterCount: clusters.length,
      totalHidden: hiddenNodes.length,
      performance: { buildTime }
    }
  };

  console.log('✅ Calm subgraph built', result.metadata);
  return result;
}

function buildFocusSubgraph(
  allNodes: CalmGraphNode[],
  allEdges: CalmGraphEdge[],
  focusNodeId: string,
  config: CalmConfig
): CalmSubgraph {
  const focusNode = allNodes.find(n => n.id === focusNodeId);
  if (!focusNode) {
    return {
      nodes: [],
      edges: [],
      clusters: [],
      hiddenNodes: allNodes,
      hiddenEdges: allEdges,
      metadata: {
        visibleNodes: 0,
        visibleEdges: 0,
        clusterCount: 0,
        totalHidden: allNodes.length,
        performance: { buildTime: 0 }
      }
    };
  }

  // Get focus node + 1-hop neighbors
  const neighborIds = getNodeNeighbors(allNodes, allEdges, focusNodeId, 1);
  const visibleNodeIds = new Set([focusNodeId, ...neighborIds]);
  
  const visibleNodes = allNodes.filter(n => visibleNodeIds.has(n.id));
  const visibleEdges = allEdges.filter(edge => 
    visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
  );

  return {
    nodes: visibleNodes,
    edges: visibleEdges,
    clusters: [],
    hiddenNodes: allNodes.filter(n => !visibleNodeIds.has(n.id)),
    hiddenEdges: allEdges.filter(edge => !visibleEdges.some(ve => ve.id === edge.id)),
    metadata: {
      visibleNodes: visibleNodes.length,
      visibleEdges: visibleEdges.length,
      clusterCount: 0,
      totalHidden: allNodes.length - visibleNodes.length,
      performance: { buildTime: performance.now() }
    }
  };
}

function findGoalPath(
  nodes: CalmGraphNode[],
  edges: CalmGraphEdge[],
  goalId: string
): string[] {
  // Simple BFS to find path from foundations to goal
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const edgeMap = new Map<string, string[]>();
  
  // Build reverse adjacency (prerequisites)
  edges.forEach(edge => {
    if (!edgeMap.has(edge.target)) {
      edgeMap.set(edge.target, []);
    }
    edgeMap.get(edge.target)!.push(edge.source);
  });

  const visited = new Set<string>();
  const path: string[] = [];

  function dfs(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    
    const prerequisites = edgeMap.get(nodeId) || [];
    prerequisites.forEach(preId => dfs(preId));
    
    path.push(nodeId);
  }

  dfs(goalId);
  return path;
}

function getNodeNeighbors(
  nodes: CalmGraphNode[],
  edges: CalmGraphEdge[],
  nodeId: string,
  hops: number
): string[] {
  const neighbors = new Set<string>();
  const queue: Array<{ id: string; distance: number }> = [{ id: nodeId, distance: 0 }];
  const visited = new Set<string>([nodeId]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    
    if (current.distance >= hops) continue;

    // Find connected nodes
    edges.forEach(edge => {
      let nextId: string | null = null;
      
      if (edge.source === current.id) {
        nextId = edge.target;
      } else if (edge.target === current.id) {
        nextId = edge.source;
      }

      if (nextId && !visited.has(nextId)) {
        visited.add(nextId);
        neighbors.add(nextId);
        queue.push({ id: nextId, distance: current.distance + 1 });
      }
    });
  }

  return Array.from(neighbors);
}

function selectRepresentativeNodes(
  nodes: CalmGraphNode[],
  config: CalmConfig
): Set<string> {
  const representative = new Set<string>();
  const nodesByLane = groupNodesByLane(nodes);

  // Select top nodes from each lane
  config.laneOrdering.forEach(lane => {
    const laneNodes = nodesByLane.get(lane) || [];
    const topNodes = laneNodes
      .sort((a, b) => (b.market_demand_score || 0) - (a.market_demand_score || 0))
      .slice(0, Math.floor(config.maxVisibleNodes / config.laneOrdering.length));
    
    topNodes.forEach(node => representative.add(node.id));
  });

  return representative;
}

function groupNodesByLane(nodes: CalmGraphNode[]): Map<string, CalmGraphNode[]> {
  const lanes = new Map<string, CalmGraphNode[]>();

  nodes.forEach(node => {
    const lane = mapNodeToLane(node);
    if (!lanes.has(lane)) {
      lanes.set(lane, []);
    }
    lanes.get(lane)!.push(node);
  });

  return lanes;
}

function mapNodeToLane(node: CalmGraphNode): string {
  // Map node types to lanes
  switch (node.type) {
    case 'skill':
      return (node.category?.toLowerCase() === 'foundation') ? 'foundations' : 'skills';
    case 'course':
      return 'skills';
    case 'project':
      return 'projects';
    case 'certification':
      return 'credentials';
    case 'job':
      return 'jobs';
    case 'step':
      return 'skills';
    default:
      return 'skills';
  }
}

function buildLaneLayout(
  allNodes: CalmGraphNode[],
  coreNodeIds: string[],
  expandedClusters: Set<string>,
  config: CalmConfig
): { visibleNodes: CalmGraphNode[]; clusters: ClusterNode[] } {
  const nodesByLane = groupNodesByLane(allNodes);
  const visibleNodes: CalmGraphNode[] = [];
  const clusters: ClusterNode[] = [];

  config.laneOrdering.forEach((lane, laneIndex) => {
    const laneNodes = nodesByLane.get(lane) || [];
    const laneX = 100 + laneIndex * LANE_WIDTH;
    
    // Separate visible and hidden nodes in this lane
    const visibleLaneNodes = laneNodes.filter(n => coreNodeIds.includes(n.id));
    const hiddenLaneNodes = laneNodes.filter(n => !coreNodeIds.includes(n.id));
    
    // Position visible nodes
    visibleLaneNodes.forEach((node, index) => {
      const row = Math.floor(index / NODES_PER_ROW);
      const col = index % NODES_PER_ROW;
      
      node.position = {
        x: laneX + col * 80,
        y: 100 + row * NODE_Y_GAP
      };
      
      visibleNodes.push(node);
    });

    // Create cluster for hidden nodes if any
    if (hiddenLaneNodes.length > 0) {
      const clusterId = `cluster-${lane}`;
      const isExpanded = expandedClusters.has(clusterId);
      
      if (isExpanded) {
        // Show expanded nodes
        hiddenLaneNodes.forEach((node, index) => {
          const startRow = Math.ceil(visibleLaneNodes.length / NODES_PER_ROW);
          const row = startRow + Math.floor(index / NODES_PER_ROW);
          const col = index % NODES_PER_ROW;
          
          node.position = {
            x: laneX + col * 80,
            y: 100 + row * NODE_Y_GAP
          };
          
          visibleNodes.push(node);
        });
      } else {
        // Create cluster node
        const clusterY = 100 + Math.ceil(visibleLaneNodes.length / NODES_PER_ROW) * NODE_Y_GAP;
        
        const cluster: ClusterNode = {
          id: clusterId,
          type: 'cluster',
          lane,
          count: hiddenLaneNodes.length,
          title: `+${hiddenLaneNodes.length} ${lane}`,
          position: { x: laneX, y: clusterY },
          data: {
            title: `+${hiddenLaneNodes.length} ${lane}`,
            hiddenNodes: hiddenLaneNodes,
            category: lane,
            'data-testid': 'cluster-node',
            'data-node-type': 'cluster',
            'data-node-id': clusterId
          },
          style: {
            border: '2px dashed hsl(var(--border))',
            background: 'hsl(var(--muted))',
            borderRadius: '8px',
            padding: '12px',
            width: 160,
            height: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            cursor: 'pointer',
            opacity: 0.8
          }
        };
        
        clusters.push(cluster);
      }
    }
  });

  return { visibleNodes, clusters };
}