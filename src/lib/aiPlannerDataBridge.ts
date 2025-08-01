import { LearningPath, PathNode } from '@/hooks/useAIPlanningEngine';

// Types for enhanced graph representation
export interface GraphNode {
  id: string;
  title: string;
  type: string;
  category?: string;
  description?: string;
  estimated_time_hours?: number;
  cost_estimate?: number;
  market_demand_score?: number;
  difficulty_level?: number;
  metadata?: {
    isCheckpoint?: boolean;
    isBranchPoint?: boolean;
    isTerminal?: boolean;
    progressPercentage?: number;
    pathType?: 'fastest' | 'cheapest' | 'highest_roi' | 'easiest';
    branchOptions?: string[];
    roiScore?: number;
    timeToComplete?: number;
    prerequisites?: string[];
    position?: {
      x: number;
      y: number;
      z: number;
    };
  };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  weight?: number;
  metadata?: {
    pathType?: 'fastest' | 'cheapest' | 'highest_roi' | 'easiest';
    isBranch?: boolean;
    isCheckpointConnection?: boolean;
    confidence?: number;
  };
}

export interface ConvertedGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  pathMetadata: {
    totalPaths: number;
    pathTypes: Array<'fastest' | 'cheapest' | 'highest_roi' | 'easiest'>;
    checkpointCount: number;
    branchPointCount: number;
  };
}

// Enhanced data bridge for AI Planner integration
export class AIPlannerDataBridge {
  
  /**
   * Converts learning paths to unified graph format with checkpoint and branching detection
   */
  static convertLearningPathsToGraph(learningPaths: LearningPath[]): ConvertedGraphData {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const processedNodeIds = new Set<string>();
    
    // Track path intersections for branch detection
    const nodePathMap = new Map<string, Set<string>>();
    
    // Process each learning path
    learningPaths.forEach((path, pathIndex) => {
      const pathId = `path-${pathIndex}`;
      
      // Convert path nodes to graph nodes
      path.nodes.forEach((pathNode, nodeIndex) => {
        const nodeId = this.generateNodeId(pathNode, pathIndex, nodeIndex);
        
        // Track which paths use this node for branch detection
        if (!nodePathMap.has(nodeId)) {
          nodePathMap.set(nodeId, new Set());
        }
        nodePathMap.get(nodeId)!.add(pathId);
        
        // Only create node if we haven't processed it yet
        if (!processedNodeIds.has(nodeId)) {
          const graphNode = this.convertPathNodeToGraphNode(
            pathNode, 
            nodeId, 
            path.path_type,
            nodeIndex,
            path.nodes.length
          );
          
          nodes.push(graphNode);
          processedNodeIds.add(nodeId);
        }
        
        // Create edges between consecutive nodes in the path
        if (nodeIndex > 0) {
          const prevNodeId = this.generateNodeId(path.nodes[nodeIndex - 1], pathIndex, nodeIndex - 1);
          const edgeId = `${prevNodeId}-${nodeId}`;
          
          edges.push({
            id: edgeId,
            source: prevNodeId,
            target: nodeId,
            type: 'learning_progression',
            weight: this.calculateEdgeWeight(path.nodes[nodeIndex - 1], pathNode),
            metadata: {
              pathType: path.path_type,
              confidence: 0.9
            }
          });
        }
      });
    });
    
    // Enhance nodes with branch detection and checkpoint identification
    this.enhanceNodesWithBranchingAndCheckpoints(nodes, nodePathMap, learningPaths);
    
    // Add branch edges for alternative paths
    this.addBranchEdges(edges, nodes, learningPaths);
    
    // Calculate positioning for enhanced layout
    this.calculateEnhancedPositioning(nodes, edges, learningPaths);
    
    return {
      nodes,
      edges,
      pathMetadata: {
        totalPaths: learningPaths.length,
        pathTypes: learningPaths.map(p => p.path_type),
        checkpointCount: nodes.filter(n => n.metadata?.isCheckpoint).length,
        branchPointCount: nodes.filter(n => n.metadata?.isBranchPoint).length
      }
    };
  }
  
  /**
   * Generate consistent node ID based on content
   */
  private static generateNodeId(pathNode: PathNode, pathIndex: number, nodeIndex: number): string {
    // Use title and type to create consistent IDs across paths
    const baseId = `${pathNode.type}-${pathNode.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
    return `${baseId}-${pathIndex}-${nodeIndex}`;
  }
  
  /**
   * Convert PathNode to GraphNode with enhanced metadata
   */
  private static convertPathNodeToGraphNode(
    pathNode: PathNode, 
    nodeId: string, 
    pathType: 'fastest' | 'cheapest' | 'highest_roi' | 'easiest',
    nodeIndex: number,
    totalNodes: number
  ): GraphNode {
    return {
      id: nodeId,
      title: pathNode.title || 'Untitled Node',
      type: pathNode.type || 'skill',
      category: this.inferCategory(pathNode.type || 'skill'),
      description: `${pathNode.type || 'Learning'} component in your path`,
      estimated_time_hours: pathNode.estimated_time_hours || 0,
      cost_estimate: pathNode.cost_estimate || 0,
      market_demand_score: pathNode.market_demand_score || 0.5,
      difficulty_level: pathNode.difficulty_level || 1,
      metadata: {
        isCheckpoint: this.isCheckpoint(pathNode, nodeIndex, totalNodes),
        isBranchPoint: false, // Will be set in enhancement phase
        isTerminal: nodeIndex === totalNodes - 1,
        progressPercentage: 0,
        pathType,
        roiScore: this.calculateROIScore(pathNode),
        timeToComplete: pathNode.estimated_time_hours || 0,
        prerequisites: [],
        position: {
          x: nodeIndex * 150,
          y: 0,
          z: 0
        }
      }
    };
  }
  
  /**
   * Enhance nodes with branching and checkpoint detection
   */
  private static enhanceNodesWithBranchingAndCheckpoints(
    nodes: GraphNode[], 
    nodePathMap: Map<string, Set<string>>,
    learningPaths: LearningPath[]
  ): void {
    nodes.forEach(node => {
      // Detect branch points (nodes shared by multiple paths)
      const pathsUsingNode = nodePathMap.get(node.id);
      if (pathsUsingNode && pathsUsingNode.size > 1) {
        node.metadata!.isBranchPoint = true;
        node.metadata!.branchOptions = Array.from(pathsUsingNode);
      }
      
      // Enhanced checkpoint detection
      if (this.isSkillMilestone(node) || this.isCourseCompletion(node) || this.isCapstoneProject(node)) {
        node.metadata!.isCheckpoint = true;
      }
    });
  }
  
  /**
   * Add branch edges for alternative paths
   */
  private static addBranchEdges(edges: GraphEdge[], nodes: GraphNode[], learningPaths: LearningPath[]): void {
    const branchNodes = nodes.filter(n => n.metadata?.isBranchPoint);
    
    branchNodes.forEach(branchNode => {
      // Find alternative next steps from this branch point
      learningPaths.forEach((path, pathIndex) => {
        const nodeInPath = path.nodes.find(pn => 
          this.generateNodeId(pn, pathIndex, path.nodes.indexOf(pn)) === branchNode.id
        );
        
        if (nodeInPath) {
          const nodeIndexInPath = path.nodes.indexOf(nodeInPath);
          if (nodeIndexInPath < path.nodes.length - 1) {
            const nextNode = path.nodes[nodeIndexInPath + 1];
            const nextNodeId = this.generateNodeId(nextNode, pathIndex, nodeIndexInPath + 1);
            
            // Add branch edge if it doesn't already exist
            const existingEdge = edges.find(e => e.source === branchNode.id && e.target === nextNodeId);
            if (!existingEdge) {
              edges.push({
                id: `branch-${branchNode.id}-${nextNodeId}`,
                source: branchNode.id,
                target: nextNodeId,
                type: 'branch_option',
                metadata: {
                  pathType: path.path_type,
                  isBranch: true,
                  confidence: 0.8
                }
              });
            }
          }
        }
      });
    });
  }
  
  /**
   * Calculate enhanced positioning for layout
   */
  private static calculateEnhancedPositioning(
    nodes: GraphNode[], 
    edges: GraphEdge[], 
    learningPaths: LearningPath[]
  ): void {
    const pathSpacing = 300;
    const nodeSpacing = 150;
    
    learningPaths.forEach((path, pathIndex) => {
      const yOffset = pathIndex * pathSpacing;
      
      path.nodes.forEach((pathNode, nodeIndex) => {
        const nodeId = this.generateNodeId(pathNode, pathIndex, nodeIndex);
        const node = nodes.find(n => n.id === nodeId);
        
        if (node) {
          // Add position metadata for layout algorithm
          node.metadata = {
            ...node.metadata,
            position: {
              x: nodeIndex * nodeSpacing,
              y: yOffset,
              z: node.metadata?.isCheckpoint ? 10 : (node.metadata?.isBranchPoint ? 5 : 0)
            }
          };
        }
      });
    });
  }
  
  // Helper methods for node classification
  private static inferCategory(type: string): string {
    const categoryMap: Record<string, string> = {
      'skill': 'Skills',
      'course': 'Learning',
      'certification': 'Certification',
      'project': 'Experience',
      'job': 'Career Goals'
    };
    return categoryMap[type] || 'Other';
  }
  
  private static isCheckpoint(pathNode: PathNode, nodeIndex: number, totalNodes: number): boolean {
    // First and last nodes are always checkpoints
    if (nodeIndex === 0 || nodeIndex === totalNodes - 1) return true;
    
    // Certifications and major skills are checkpoints
    if (pathNode.type === 'certification') return true;
    if (pathNode.type === 'skill' && pathNode.difficulty_level >= 3) return true;
    
    // High-cost or long-duration items are checkpoints
    if (pathNode.cost_estimate > 500 || pathNode.estimated_time_hours > 40) return true;
    
    return false;
  }
  
  private static isSkillMilestone(node: GraphNode): boolean {
    return node.type === 'skill' && (node.difficulty_level || 0) >= 3;
  }
  
  private static isCourseCompletion(node: GraphNode): boolean {
    return node.type === 'course' && (node.estimated_time_hours || 0) > 20;
  }
  
  private static isCapstoneProject(node: GraphNode): boolean {
    return node.type === 'project' || (node.title.toLowerCase().includes('project') && (node.estimated_time_hours || 0) > 40);
  }
  
  private static calculateEdgeWeight(sourceNode: PathNode, targetNode: PathNode): number {
    // Weight based on difficulty progression and time investment
    const difficultyWeight = (targetNode.difficulty_level - sourceNode.difficulty_level) * 0.2;
    const timeWeight = targetNode.estimated_time_hours * 0.01;
    return Math.max(0.1, Math.min(1.0, difficultyWeight + timeWeight + 0.5));
  }
  
  private static calculateROIScore(pathNode: PathNode): number {
    // Simple ROI calculation based on market demand vs cost and time
    const demandScore = pathNode.market_demand_score || 0.5;
    const costFactor = Math.max(0.1, 1 - (pathNode.cost_estimate / 1000));
    const timeFactor = Math.max(0.1, 1 - (pathNode.estimated_time_hours / 100));
    
    return demandScore * costFactor * timeFactor;
  }
}