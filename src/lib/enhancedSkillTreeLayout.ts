// Enhanced Skill Tree Layout Engine
// Implements semantic clustering, category grouping, and intelligent positioning

export interface LayoutNode {
  id: string;
  type: 'skill' | 'job' | 'course' | 'project' | 'certification' | 'step';
  title: string;
  category?: string;
  level?: number;
  data?: any;
}

export interface LayoutEdge {
  source: string;
  target: string;
  type: 'teaches' | 'requires' | 'qualifies_for' | 'supports' | 'prerequisite';
}

export interface LayoutConfig {
  algorithm: 'semantic-hierarchy' | 'category-cluster' | 'goal-focused' | 'progressive-disclosure';
  containerWidth: number;
  containerHeight: number;
  nodeSpacing: {
    horizontal: number;
    vertical: number;
    category: number;
  };
  layerHeight: number;
  focusNodeId?: string;
  showOnlyGoalPath?: boolean;
  goalPath?: string[];
}

export interface PositionedNode extends LayoutNode {
  x: number;
  y: number;
  depth?: number;
  clusterGroup?: string;
}

export class EnhancedSkillTreeLayout {
  private nodes: LayoutNode[];
  private edges: LayoutEdge[];
  private config: LayoutConfig;
  private categoryColors: Map<string, string>;
  private depthCache: Map<string, number>;

  constructor(nodes: LayoutNode[], edges: LayoutEdge[], config: LayoutConfig) {
    this.nodes = nodes;
    this.edges = edges;
    this.config = config;
    this.categoryColors = this.initializeCategoryColors();
    this.depthCache = new Map();
  }

  private initializeCategoryColors(): Map<string, string> {
    const colors = new Map();
    const categoryPalette = [
      '#3b82f6', // blue
      '#f59e0b', // amber  
      '#10b981', // emerald
      '#ec4899', // pink
      '#6366f1', // indigo
      '#06b6d4', // cyan
      '#f97316', // orange
      '#84cc16', // lime
      '#ef4444', // red
      '#eab308'  // yellow
    ];

    const categories = [...new Set(this.nodes.map(n => n.category).filter(Boolean))];
    categories.forEach((category, index) => {
      colors.set(category!, categoryPalette[index % categoryPalette.length]);
    });

    return colors;
  }

  public calculateLayout(): PositionedNode[] {
    console.log(`🎨 Starting enhanced layout calculation with ${this.config.algorithm}`);
    
    switch (this.config.algorithm) {
      case 'semantic-hierarchy':
        return this.calculateSemanticHierarchy();
      case 'category-cluster':
        return this.calculateCategoryCluster();
      case 'goal-focused':
        return this.calculateGoalFocused();
      case 'progressive-disclosure':
        return this.calculateProgressiveDisclosure();
      default:
        return this.calculateSemanticHierarchy();
    }
  }

  private calculateSemanticHierarchy(): PositionedNode[] {
    // 1. Calculate depth for each node based on dependencies
    const depthMap = this.calculateNodeDepths();
    
    // 2. Group nodes by type and depth
    const layers = this.groupNodesByDepthAndType(depthMap);
    
    // 3. Position nodes with semantic rules
    return this.positionSemanticLayers(layers);
  }

  private calculateCategoryCluster(): PositionedNode[] {
    // Group nodes by category first, then by type
    const categoryGroups = this.groupNodesByCategory();
    return this.positionCategoryGroups(categoryGroups);
  }

  private calculateGoalFocused(): PositionedNode[] {
    if (!this.config.focusNodeId) {
      return this.calculateSemanticHierarchy();
    }

    // Find path to goal node and position around it
    const goalPath = this.findPathToNode(this.config.focusNodeId);
    return this.positionGoalFocusedLayout(goalPath);
  }

  private calculateProgressiveDisclosure(): PositionedNode[] {
    // Show only relevant nodes based on user progress/goals
    const filteredNodes = this.config.showOnlyGoalPath && this.config.goalPath 
      ? this.nodes.filter(n => this.config.goalPath!.includes(n.id))
      : this.nodes;

    // Use semantic hierarchy for filtered nodes
    const tempLayout = new EnhancedSkillTreeLayout(
      filteredNodes, 
      this.edges.filter(e => 
        filteredNodes.find(n => n.id === e.source) && 
        filteredNodes.find(n => n.id === e.target)
      ), 
      { ...this.config, algorithm: 'semantic-hierarchy' }
    );
    
    return tempLayout.calculateSemanticHierarchy();
  }

  private calculateNodeDepths(): Map<string, number> {
    const depths = new Map<string, number>();
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const cycleEdges = new Set<string>();

    const calculateDepth = (nodeId: string): number => {
      if (depths.has(nodeId)) return depths.get(nodeId)!;
      if (visiting.has(nodeId)) {
        console.warn(`🔄 Circular dependency detected involving node ${nodeId}`);
        // Mark the cycle edge for future reference
        cycleEdges.add(nodeId);
        return 0;
      }

      visiting.add(nodeId);
      
      // Find all dependencies (incoming edges)
      const dependencies = this.edges.filter(e => e.target === nodeId);
      
      if (dependencies.length === 0) {
        // Root node
        depths.set(nodeId, 0);
        visiting.delete(nodeId);
        return 0;
      }

      // Calculate max depth of dependencies + 1
      const depthValues = dependencies.map(dep => calculateDepth(dep.source));
      const maxDepth = Math.max(...depthValues) + 1;
      
      depths.set(nodeId, maxDepth);
      visiting.delete(nodeId);
      visited.add(nodeId);
      
      return maxDepth;
    };

    // PR-3: Enhanced orphan handling
    this.nodes.forEach(node => {
      if (!visited.has(node.id)) {
        const depth = calculateDepth(node.id);
        
        // Check if node is truly orphaned (no incoming or outgoing edges)
        const hasEdges = this.edges.some(e => 
          e.source === node.id || e.target === node.id
        );
        
        if (!hasEdges) {
          console.log(`🏝️ Orphan node detected: ${node.title} (${node.id})`);
          depths.set(node.id, 999); // Place orphans at bottom
        }
      }
    });

    // PR-3: Longest path refinement for complex DAGs
    this.refineLongestPath(depths);

    return depths;
  }

  // PR-3: New method for longest-path refinement
  private refineLongestPath(depths: Map<string, number>): void {
    let changed = true;
    let iterations = 0;
    const maxIterations = 10;
    
    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;
      
      this.edges.forEach(edge => {
        const sourceDepth = depths.get(edge.source) ?? 0;
        const targetDepth = depths.get(edge.target) ?? 0;
        
        // Target should be at least source + 1
        if (targetDepth <= sourceDepth) {
          depths.set(edge.target, sourceDepth + 1);
          changed = true;
        }
      });
    }
    
    console.log(`🔄 Longest path refinement completed in ${iterations} iterations`);
  }

  private groupNodesByDepthAndType(depthMap: Map<string, number>): Map<number, Map<string, LayoutNode[]>> {
    const layers = new Map<number, Map<string, LayoutNode[]>>();

    this.nodes.forEach(node => {
      const depth = depthMap.get(node.id) ?? 999; // Disconnected nodes go to bottom
      
      if (!layers.has(depth)) {
        layers.set(depth, new Map());
      }
      
      const depthLayer = layers.get(depth)!;
      if (!depthLayer.has(node.type)) {
        depthLayer.set(node.type, []);
      }
      
      depthLayer.get(node.type)!.push(node);
    });

    return layers;
  }

  private positionSemanticLayers(layers: Map<number, Map<string, LayoutNode[]>>): PositionedNode[] {
    const positioned: PositionedNode[] = [];
    const typeOrder = ['skill', 'course', 'project', 'certification', 'step', 'job'];
    
    // PR-1 FIX: Use depth-based positioning instead of typeIndex override
    const LAYER_GAP = 180; // Consistent vertical spacing between depths  
    const GROUP_Y_OFFSET = 35; // Small offset for type grouping within depth
    
    // Node dimensions for collision detection
    const nodeWidth = 170;
    const nodeHeight = 100;
    const minSpacing = 50; // Minimum space between nodes
    
    // Sort layers by depth
    const sortedDepths = Array.from(layers.keys()).sort((a, b) => a - b);
    
    console.log('🎨 Positioning layers with depths:', sortedDepths);
    
    sortedDepths.forEach((depth, depthIndex) => {
      const depthLayer = layers.get(depth)!;
      
      // PR-1 CRITICAL FIX: Base Y coordinate determined by depth only
      const baseY = 120 + depth * LAYER_GAP; // Use depth, not depthIndex
      
      console.log(`📍 Depth ${depth} positioned at baseY: ${baseY}`);
      
      // Position each type within the layer
      typeOrder.forEach((type, typeIndex) => {
        if (!depthLayer.has(type)) return;
        
        const nodesOfType = depthLayer.get(type)!;
        
        // Group by category within type
        const categoryGroups = this.groupNodesByCategory(nodesOfType);
        
        // PR-1 FIX: Small type offset from base depth position
        const finalY = baseY + (typeIndex * GROUP_Y_OFFSET);
        let currentX = 100;
        
        categoryGroups.forEach((categoryNodes, category) => {
          // Sort nodes within category by edge relationships and title
          const sortedNodes = this.sortNodesByRelationships(categoryNodes);
          
          // PR-1 FIX: Use finalY instead of typeY to preserve depth-based positioning
          const clusterNodes = this.createCategoryCluster(sortedNodes, currentX, finalY, nodeWidth, nodeHeight, minSpacing);
          
          clusterNodes.forEach(positionedNode => {
            // Check for collisions with existing nodes
            const finalPosition = this.resolveCollisions(positionedNode, positioned, nodeWidth, nodeHeight, minSpacing);
            positioned.push({
              ...positionedNode,
              x: finalPosition.x,
              y: finalPosition.y,
              depth,
              clusterGroup: `${type}-${category}`
            });
          });
          
          // Update currentX for next category
          const maxX = Math.max(...clusterNodes.map(n => n.x));
          currentX = maxX + nodeWidth + this.config.nodeSpacing.category;
        });
      });
    });

    return positioned;
  }

  private sortNodesByRelationships(nodes: LayoutNode[]): LayoutNode[] {
    // Sort by incoming edge count (more dependencies = higher in layer)
    return nodes.sort((a, b) => {
      const aIncoming = this.edges.filter(e => e.target === a.id).length;
      const bIncoming = this.edges.filter(e => e.target === b.id).length;
      
      if (aIncoming !== bIncoming) {
        return bIncoming - aIncoming; // More dependencies first
      }
      
      return a.title.localeCompare(b.title);
    });
  }

  private createCategoryCluster(nodes: LayoutNode[], startX: number, startY: number, nodeWidth: number, nodeHeight: number, minSpacing: number): PositionedNode[] {
    const positioned: PositionedNode[] = [];
    const nodesPerRow = Math.min(4, Math.ceil(Math.sqrt(nodes.length))); // Max 4 nodes per row
    
    nodes.forEach((node, index) => {
      const row = Math.floor(index / nodesPerRow);
      const col = index % nodesPerRow;
      
      const x = startX + col * (nodeWidth + minSpacing);
      const y = startY + row * (nodeHeight + minSpacing);
      
      positioned.push({
        ...node,
        x,
        y
      });
    });
    
    return positioned;
  }

  private resolveCollisions(newNode: PositionedNode, existingNodes: PositionedNode[], nodeWidth: number, nodeHeight: number, minSpacing: number): { x: number, y: number } {
    let { x, y } = newNode;
    let attempts = 0;
    const maxAttempts = 50;
    
    while (attempts < maxAttempts) {
      let hasCollision = false;
      
      for (const existing of existingNodes) {
        if (this.nodesOverlap(x, y, existing.x, existing.y, nodeWidth, nodeHeight, minSpacing)) {
          hasCollision = true;
          // Move right first, then down if needed
          x = existing.x + nodeWidth + minSpacing;
          
          // If we've moved too far right, move to next row
          if (x > this.config.containerWidth - nodeWidth) {
            x = 100; // Reset to left margin
            y += nodeHeight + minSpacing;
          }
          break;
        }
      }
      
      if (!hasCollision) break;
      attempts++;
    }
    
    return { x, y };
  }

  private nodesOverlap(x1: number, y1: number, x2: number, y2: number, nodeWidth: number, nodeHeight: number, minSpacing: number): boolean {
    const buffer = minSpacing / 2;
    return !(
      x1 + nodeWidth + buffer < x2 ||
      x2 + nodeWidth + buffer < x1 ||
      y1 + nodeHeight + buffer < y2 ||
      y2 + nodeHeight + buffer < y1
    );
  }

  private groupNodesByCategory(nodes: LayoutNode[] = this.nodes): Map<string, LayoutNode[]> {
    const groups = new Map<string, LayoutNode[]>();
    
    nodes.forEach(node => {
      const category = node.category || 'Uncategorized';
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(node);
    });
    
    return groups;
  }

  private positionCategoryGroups(categoryGroups: Map<string, LayoutNode[]>): PositionedNode[] {
    const positioned: PositionedNode[] = [];
    const categoriesPerRow = 3;
    const categoryWidth = this.config.containerWidth / categoriesPerRow;
    const categoryHeight = 300;
    
    let categoryIndex = 0;
    
    categoryGroups.forEach((nodes, category) => {
      const row = Math.floor(categoryIndex / categoriesPerRow);
      const col = categoryIndex % categoriesPerRow;
      
      const baseX = col * categoryWidth + 50;
      const baseY = row * categoryHeight + 100;
      
      // Position nodes within category cluster
      const nodesPerRow = Math.ceil(Math.sqrt(nodes.length));
      
      nodes.forEach((node, nodeIndex) => {
        const nodeRow = Math.floor(nodeIndex / nodesPerRow);
        const nodeCol = nodeIndex % nodesPerRow;
        
        positioned.push({
          ...node,
          x: baseX + nodeCol * this.config.nodeSpacing.horizontal,
          y: baseY + nodeRow * this.config.nodeSpacing.vertical,
          clusterGroup: category
        });
      });
      
      categoryIndex++;
    });
    
    return positioned;
  }

  private findPathToNode(targetId: string): string[] {
    const path: string[] = [];
    const visited = new Set<string>();
    
    const dfs = (nodeId: string): boolean => {
      if (visited.has(nodeId)) return false;
      visited.add(nodeId);
      path.push(nodeId);
      
      if (nodeId === targetId) return true;
      
      // Check all connected nodes
      const connectedEdges = this.edges.filter(e => e.source === nodeId || e.target === nodeId);
      
      for (const edge of connectedEdges) {
        const nextNode = edge.source === nodeId ? edge.target : edge.source;
        if (dfs(nextNode)) return true;
      }
      
      path.pop();
      return false;
    };
    
    // Start from root nodes
    const rootNodes = this.nodes.filter(n => 
      !this.edges.some(e => e.target === n.id)
    );
    
    for (const root of rootNodes) {
      if (dfs(root.id)) break;
    }
    
    return path;
  }

  private positionGoalFocusedLayout(goalPath: string[]): PositionedNode[] {
    const positioned: PositionedNode[] = [];
    const centerX = this.config.containerWidth / 2;
    const centerY = this.config.containerHeight / 2;
    
    // Position goal path nodes in a line
    goalPath.forEach((nodeId, index) => {
      const node = this.nodes.find(n => n.id === nodeId);
      if (!node) return;
      
      positioned.push({
        ...node,
        x: centerX - (goalPath.length * 50) + (index * 100),
        y: centerY,
        clusterGroup: 'goal-path'
      });
    });
    
    // Position other connected nodes around the path
    const pathNodeIds = new Set(goalPath);
    const connectedNodes = this.nodes.filter(node => {
      if (pathNodeIds.has(node.id)) return false;
      
      return this.edges.some(edge => 
        (pathNodeIds.has(edge.source) && edge.target === node.id) ||
        (pathNodeIds.has(edge.target) && edge.source === node.id)
      );
    });
    
    // Arrange connected nodes in a circle around the path
    const radius = 200;
    connectedNodes.forEach((node, index) => {
      const angle = (index / connectedNodes.length) * 2 * Math.PI;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      positioned.push({
        ...node,
        x,
        y,
        clusterGroup: 'connected'
      });
    });
    
    return positioned;
  }

  public getCategoryColor(category: string): string {
    return this.categoryColors.get(category) || '#9ca3af';
  }

  public getLayoutStatistics() {
    const depthMap = this.calculateNodeDepths();
    const categories = [...new Set(this.nodes.map(n => n.category).filter(Boolean))];
    
    return {
      totalNodes: this.nodes.length,
      totalEdges: this.edges.length,
      maxDepth: Math.max(...Array.from(depthMap.values())),
      categoriesCount: categories.length,
      categories,
      typeDistribution: this.nodes.reduce((acc, node) => {
        acc[node.type] = (acc[node.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }
}

// Utility function for easy usage
export function calculateEnhancedSkillTreeLayout(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  config: Partial<LayoutConfig> = {}
): PositionedNode[] {
  const defaultConfig: LayoutConfig = {
    algorithm: 'semantic-hierarchy',
    containerWidth: 1200,
    containerHeight: 800,
    nodeSpacing: {
      horizontal: 160,
      vertical: 120,
      category: 40
    },
    layerHeight: 180,
    ...config
  };

  const layout = new EnhancedSkillTreeLayout(nodes, edges, defaultConfig);
  return layout.calculateLayout();
}