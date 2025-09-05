// Educational Layout V4 - Simple, Clear Learning Progression
// Based on research: depth-based positioning with semantic lanes

type Id = string;
type Point = { x: number; y: number };

interface EducationalNode {
  id: Id;
  label: string;
  type: 'foundation' | 'lower' | 'upper' | 'credential' | 'career';
  width: number;
  height: number;
  x?: number;
  y?: number;
  depth?: number;
  data?: any;
}

interface EducationalEdge {
  id: Id;
  source: Id;
  target: Id;
  kind: 'requires' | 'teaches' | 'credit_transfer' | 'related';
  points?: Point[];
  data?: any;
}

interface EducationalGraph {
  nodes: EducationalNode[];
  edges: EducationalEdge[];
}

interface EducationalLayoutOptions {
  nodeWidth: number;
  nodeHeight: number;
  hGap: number;
  vGap: number;
  laneWidth: number;
  margin: number;
}

// Semantic lane configuration for educational progression
const SEMANTIC_LANES = {
  foundation: { x: 0, label: 'Foundation', color: 'hsl(var(--blue-500))' },
  lower: { x: 340, label: 'Lower Division', color: 'hsl(var(--green-500))' },
  upper: { x: 680, label: 'Upper Division', color: 'hsl(var(--orange-500))' },
  credential: { x: 1020, label: 'Credentials', color: 'hsl(var(--purple-500))' },
  career: { x: 1360, label: 'Career', color: 'hsl(var(--red-500))' }
} as const;

const DEFAULT_OPTIONS: EducationalLayoutOptions = {
  nodeWidth: 260,
  nodeHeight: 120,
  hGap: 80,
  vGap: 40,
  laneWidth: 340,
  margin: 20
};

/**
 * Compute topological depth for each node (foundation → career progression)
 */
function computeTopologicalDepth(nodes: EducationalNode[], edges: EducationalEdge[]): Map<Id, number> {
  const depths = new Map<Id, number>();
  const inDegree = new Map<Id, number>();
  const outgoing = new Map<Id, Id[]>();
  
  // Initialize
  nodes.forEach(n => {
    depths.set(n.id, 0);
    inDegree.set(n.id, 0);
    outgoing.set(n.id, []);
  });
  
  // Build graph and count in-degrees
  edges.forEach(e => {
    if (e.kind === 'requires' || e.kind === 'teaches') {
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
      const targets = outgoing.get(e.source) || [];
      targets.push(e.target);
      outgoing.set(e.source, targets);
    }
  });
  
  // Topological sort with depth assignment
  const queue: Id[] = [];
  nodes.forEach(n => {
    if ((inDegree.get(n.id) || 0) === 0) {
      queue.push(n.id);
      depths.set(n.id, 0);
    }
  });
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDepth = depths.get(current) || 0;
    
    const targets = outgoing.get(current) || [];
    targets.forEach(target => {
      const newDegree = (inDegree.get(target) || 0) - 1;
      inDegree.set(target, newDegree);
      
      // Update depth to be max of all incoming paths
      const newDepth = Math.max(depths.get(target) || 0, currentDepth + 1);
      depths.set(target, newDepth);
      
      if (newDegree === 0) {
        queue.push(target);
      }
    });
  }
  
  return depths;
}

/**
 * Classify nodes into semantic lanes based on type and content
 */
function classifySemanticLane(node: EducationalNode): keyof typeof SEMANTIC_LANES {
  // Check explicit type first
  if (node.type && node.type in SEMANTIC_LANES) {
    return node.type as keyof typeof SEMANTIC_LANES;
  }
  
  const title = node.label.toLowerCase();
  const data = node.data || {};
  
  // Foundation: prerequisites, basic skills
  if (title.includes('intro') || title.includes('basic') || title.includes('foundation') || 
      data.category === 'prerequisite' || data.level === 'foundation') {
    return 'foundation';
  }
  
  // Lower division: 100-200 level courses
  if (data.level === 'associate' || title.includes('survey') || 
      (data.courseNumber && parseInt(data.courseNumber) < 300)) {
    return 'lower';
  }
  
  // Upper division: 300-400 level courses
  if (data.level === 'bachelor' || title.includes('advanced') || 
      (data.courseNumber && parseInt(data.courseNumber) >= 300)) {
    return 'upper';
  }
  
  // Credentials: degrees, certificates
  if (node.type === 'credential' || title.includes('degree') || title.includes('certificate') || 
      data.type === 'degree' || data.type === 'certificate') {
    return 'credential';
  }
  
  // Career: jobs, outcomes
  if (title.includes('job') || data.type === 'job' || data.category === 'career') {
    return 'career';
  }
  
  // Default to lower division for courses
  return 'lower';
}

/**
 * Position nodes using simple collision detection within lanes
 */
function positionNodesInLanes(
  nodes: EducationalNode[], 
  depths: Map<Id, number>, 
  options: EducationalLayoutOptions
): EducationalNode[] {
  const positioned = nodes.map(node => ({ ...node }));
  const { nodeHeight, vGap, margin } = options;
  
  // Group nodes by semantic lane
  const laneGroups = new Map<string, EducationalNode[]>();
  positioned.forEach(node => {
    const lane = classifySemanticLane(node);
    if (!laneGroups.has(lane)) laneGroups.set(lane, []);
    laneGroups.get(lane)!.push(node);
  });
  
  // Position nodes within each lane
  laneGroups.forEach((laneNodes, laneKey) => {
    const laneInfo = SEMANTIC_LANES[laneKey as keyof typeof SEMANTIC_LANES];
    
    // Sort by depth (educational progression)
    laneNodes.sort((a, b) => (depths.get(a.id) || 0) - (depths.get(b.id) || 0));
    
    // Position with collision detection
    let currentY = margin;
    laneNodes.forEach(node => {
      node.x = laneInfo.x;
      node.y = currentY;
      node.depth = depths.get(node.id) || 0;
      currentY += nodeHeight + vGap;
    });
  });
  
  return positioned;
}

/**
 * Generate simple straight-line edges with proper anchoring
 */
function generateStraightEdges(
  nodes: EducationalNode[], 
  edges: EducationalEdge[], 
  options: EducationalLayoutOptions
): EducationalEdge[] {
  const nodeById = new Map(nodes.map(n => [n.id, n]));
  const { nodeWidth, nodeHeight } = options;
  
  return edges.map(edge => {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    
    if (!source || !target || source.x === undefined || source.y === undefined || 
        target.x === undefined || target.y === undefined) {
      return edge;
    }
    
    // Calculate anchor points to avoid node overlap
    const sourceCenter = { x: source.x + nodeWidth / 2, y: source.y + nodeHeight / 2 };
    const targetCenter = { x: target.x + nodeWidth / 2, y: target.y + nodeHeight / 2 };
    
    let sourceAnchor: Point;
    let targetAnchor: Point;
    
    // Determine connection side based on relative position
    if (sourceCenter.x < targetCenter.x) {
      // Source left of target - connect right to left
      sourceAnchor = { x: source.x + nodeWidth, y: sourceCenter.y };
      targetAnchor = { x: target.x, y: targetCenter.y };
    } else {
      // Source right of target - connect left to right  
      sourceAnchor = { x: source.x, y: sourceCenter.y };
      targetAnchor = { x: target.x + nodeWidth, y: targetCenter.y };
    }
    
    // For credit transfers, use curved routing via intermediate points
    if (edge.kind === 'credit_transfer') {
      const midX = (sourceAnchor.x + targetAnchor.x) / 2;
      const offsetY = -50; // Curve upward for transfers
      const control1 = { x: sourceAnchor.x + 50, y: sourceAnchor.y + offsetY };
      const control2 = { x: targetAnchor.x - 50, y: targetAnchor.y + offsetY };
      
      return {
        ...edge,
        points: [sourceAnchor, control1, control2, targetAnchor]
      };
    }
    
    // Straight line for educational progression
    return {
      ...edge,
      points: [sourceAnchor, targetAnchor]
    };
  });
}

/**
 * Main educational layout function - simple, clear, performant
 */
export function educationalLayoutV4(
  inputGraph: EducationalGraph, 
  options: Partial<EducationalLayoutOptions> = {}
): EducationalGraph {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = performance.now();
  
  if (inputGraph.nodes.length === 0) {
    return { nodes: [], edges: [] };
  }
  
  // Step 1: Compute educational progression depth
  const depths = computeTopologicalDepth(inputGraph.nodes, inputGraph.edges);
  
  // Step 2: Position nodes in semantic lanes with collision detection
  const positionedNodes = positionNodesInLanes(inputGraph.nodes, depths, opts);
  
  // Step 3: Generate clean edge routing
  const routedEdges = generateStraightEdges(positionedNodes, inputGraph.edges, opts);
  
  const duration = performance.now() - startTime;
  if (import.meta.env.DEV) {
    console.log(`[EDUCATIONAL-LAYOUT] computed in ${duration.toFixed(1)}ms`, {
      nodes: positionedNodes.length,
      edges: routedEdges.length,
      maxDepth: Math.max(...Array.from(depths.values()))
    });
  }
  
  return {
    nodes: positionedNodes,
    edges: routedEdges
  };
}

/**
 * Performance-optimized layout with memoization
 */
export function memoizedEducationalLayout(
  inputGraph: EducationalGraph,
  options: Partial<EducationalLayoutOptions> = {}
): EducationalGraph {
  // Simple hash for memoization
  const graphHash = `${inputGraph.nodes.length}-${inputGraph.edges.length}-${JSON.stringify(options)}`;
  
  // In production, you'd want a proper memoization cache
  // For now, just ensure we log performance
  return educationalLayoutV4(inputGraph, options);
}