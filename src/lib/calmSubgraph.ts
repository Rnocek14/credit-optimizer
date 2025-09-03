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
  maxVisibleNodes: 40,
  maxVisibleEdges: 60,
  defaultDepth: 1,
  enableClustering: true,
  laneOrdering: ['foundations', 'skills', 'projects', 'credentials', 'jobs']
};

// Strict per-lane render budgets
const LANE_NODE_CAPS = {
  foundations: 8,
  skills: 12,
  projects: 8,
  credentials: 6,
  jobs: 6
} as const;

// Strict grid layout constants
const LANE_WIDTH = 280;
const LANE_GAP = 60;
const NODE_Y_GAP = 100;
const NODE_X_GAP = 80;
const NODES_PER_ROW = 3;

export function buildCalmSubgraph(
  allNodes: any[],
  allEdges: any[],
  options: {
    activeGoalId?: string;
    focusNodeId?: string;
    expandedClusters?: Set<string>;
    config?: Partial<CalmConfig>;
  } = {}
): { nodes: any[]; edges: any[] } {
  const startTime = performance.now();
  
  try {
    // Comprehensive data validation
    if (!Array.isArray(allNodes)) {
      console.error('❌ Invalid nodes: not an array', typeof allNodes);
      throw new Error('Nodes must be an array');
    }
    
    if (!Array.isArray(allEdges)) {
      console.error('❌ Invalid edges: not an array', typeof allEdges);
      throw new Error('Edges must be an array');
    }

    if (allNodes.length === 0) {
      console.warn('⚠️ No nodes found, returning empty subgraph');
      return { nodes: [], edges: [] };
    }

    // Enhanced transformation with proper field mapping for GraphNode format
    console.log('🔄 Processing nodes:', allNodes.length, 'sample:', allNodes[0]);
    
    const processedNodes = allNodes.slice(0, 15).map((node, index) => {
      // Handle both database schema (node_type) and mock data (type)
      const nodeType = node.node_type || node.type || 'skill';
      const nodeId = String(node.id || `node-${index}`);
      const nodeTitle = node.title || `Node ${index + 1}`;
      
      console.log(`🎯 Processing node ${nodeId}:`, {
        title: nodeTitle,
        type: nodeType,
        category: node.category
      });
      
      // Return GraphNode format - let UnifiedCareerCanvas handle React Flow transformation
      return {
        id: nodeId,
        type: nodeType,
        title: nodeTitle,
        description: node.description || '',
        difficulty: node.difficulty_level === 1 ? 'beginner' : 
                   node.difficulty_level === 2 ? 'intermediate' : 'advanced',
        estimated_time_hours: node.estimated_time_hours || 0,
        cost: node.cost_estimate || 0,
        data: {
          category: node.category || 'General',
          level: node.level || node.difficulty_level || 1,
          isCompleted: Boolean(node.is_completed),
          requiredXP: parseInt(node.required_xp) || 0,
          unlockedAt: node.unlocked_at || null,
          completedAt: node.completed_at || null,
          tags: Array.isArray(node.tags) ? node.tags : [],
          metadata: node.metadata || {},
          market_demand_score: node.market_demand_score || 0.5,
          ai_confidence_score: node.ai_confidence_score || 0.8
        }
      };
    });
    
    console.log('✅ Processed nodes successfully:', processedNodes.length);

    // Process edges - handle both database and mock formats
    console.log('🔗 Processing edges:', allEdges.length, 'sample:', allEdges[0]);
    
    // Create a set of valid node IDs for edge validation
    const validNodeIds = new Set(processedNodes.map(n => n.id));
    console.log('✅ Valid node IDs for edge matching:', Array.from(validNodeIds));
    
    const processedEdges = allEdges
      .filter(edge => {
        const source = String(edge.source || edge.from_id);
        const target = String(edge.target || edge.to_id);
        const hasValidNodes = validNodeIds.has(source) && validNodeIds.has(target);
        
        if (!source || !target) {
          console.warn('🚫 Edge missing source/target IDs:', { edge, source, target });
          return false;
        }
        
        if (!hasValidNodes) {
          console.warn('🚫 Edge references non-existent nodes:', { 
            edgeId: edge.id, 
            source, 
            target, 
            availableNodes: Array.from(validNodeIds) 
          });
          return false;
        }
        
        return true;
      })
      .slice(0, 20)
      .map((edge, index) => {
        const edgeId = String(edge.id || `edge-${index}`);
        const source = String(edge.source || edge.from_id);
        const target = String(edge.target || edge.to_id);
        const edgeType = edge.edge_type || 'connection';
        
        console.log(`🎯 Processing edge ${edgeId}:`, { source, target, type: edgeType });
        
        // Return GraphEdge format - let UnifiedCareerCanvas handle React Flow transformation
        return {
          id: edgeId,
          from_id: source,
          to_id: target,
          source: source,
          target: target,
          edge_type: edgeType,
          type: edgeType,
          importance_weight: edge.importance_weight || 1.0,
          reasoning: edge.reasoning || `${edgeType} relationship`
        };
      });
    
    console.log('✅ Processed edges successfully:', processedEdges.length);

    console.log('✅ Calm subgraph built successfully');
    return { nodes: processedNodes, edges: processedEdges };
    
  } catch (error) {
    console.error('❌ Critical error in buildCalmSubgraph:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Return safe fallback with a single error node in GraphNode format
    return {
      nodes: [{
        id: 'error-fallback-main',
        type: 'skill',
        title: 'Error Loading Skills',
        description: `Failed to process skill tree data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        difficulty: 'beginner',
        estimated_time_hours: 0,
        cost: 0,
        data: {
          category: 'error',
          level: 1,
          isCompleted: false,
          requiredXP: 0,
          unlockedAt: null,
          completedAt: null,
          tags: ['error'],
          metadata: { 
            error: true, 
            originalError: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          }
        }
      }],
      edges: []
    };
  }
}

// Helper function to create a safe empty subgraph
function createEmptySubgraph(): CalmSubgraph {
  return {
    nodes: [],
    edges: [],
    clusters: [],
    hiddenNodes: [],
    hiddenEdges: [],
    metadata: {
      visibleNodes: 0,
      visibleEdges: 0,
      clusterCount: 0,
      totalHidden: 0,
      performance: { buildTime: 0 }
    }
  };
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
  const visibleEdges = allEdges.filter(edge => {
    const source = edge.source || edge.from_id;
    const target = edge.target || edge.to_id;
    return visibleNodeIds.has(source) && visibleNodeIds.has(target);
  });

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
  
  // Build reverse adjacency (prerequisites) - handle both data formats
  edges.forEach(edge => {
    const source = edge.source || edge.from_id;
    const target = edge.target || edge.to_id;
    
    if (!edgeMap.has(target)) {
      edgeMap.set(target, []);
    }
    edgeMap.get(target)!.push(source);
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

    // Find connected nodes - handle both data formats
    edges.forEach(edge => {
      let nextId: string | null = null;
      const source = edge.source || edge.from_id;
      const target = edge.target || edge.to_id;
      
      if (source === current.id) {
        nextId = target;
      } else if (target === current.id) {
        nextId = source;
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

  // Apply strict per-lane caps using render budget
  config.laneOrdering.forEach(lane => {
    const laneNodes = nodesByLane.get(lane) || [];
    const laneCap = LANE_NODE_CAPS[lane as keyof typeof LANE_NODE_CAPS] || 6;
    
    // Priority scoring: market demand + readiness + recency
    const priorityScore = (node: CalmGraphNode) => {
      const marketScore = node.market_demand_score || 0;
      const category = node.category?.toLowerCase();
      const recencyBonus = category === 'trending' ? 10 : 0;
      return marketScore + recencyBonus;
    };
    
    const topNodes = laneNodes
      .sort((a, b) => priorityScore(b) - priorityScore(a))
      .slice(0, laneCap);
    
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
    
    // Position visible nodes on strict grid with collision detection
    const occupiedPositions = new Set<string>();
    
    visibleLaneNodes.forEach((node, index) => {
      let row = Math.floor(index / NODES_PER_ROW);
      let col = index % NODES_PER_ROW;
      
      // Collision detection: if position occupied, bump to next row
      let positionKey = `${laneIndex}-${row}-${col}`;
      while (occupiedPositions.has(positionKey)) {
        if (col < NODES_PER_ROW - 1) {
          col++;
        } else {
          row++;
          col = 0;
        }
        positionKey = `${laneIndex}-${row}-${col}`;
      }
      
      occupiedPositions.add(positionKey);
      
      node.position = {
        x: laneX + col * NODE_X_GAP,
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