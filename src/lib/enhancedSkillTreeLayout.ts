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

    const calculateDepth = (nodeId: string): number => {
      if (depths.has(nodeId)) return depths.get(nodeId)!;
      if (visiting.has(nodeId)) {
        console.warn(`Circular dependency detected involving node ${nodeId}`);
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

    this.nodes.forEach(node => {
      if (!visited.has(node.id)) {
        calculateDepth(node.id);
      }
    });

    return depths;
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
    const layerHeight = this.config.layerHeight;
    
    // Sort layers by depth
    const sortedDepths = Array.from(layers.keys()).sort((a, b) => a - b);
    
    sortedDepths.forEach((depth, depthIndex) => {
      const depthLayer = layers.get(depth)!;
      let layerY = 100 + depthIndex * layerHeight;
      
      // Position each type within the layer
      typeOrder.forEach((type, typeIndex) => {
        if (!depthLayer.has(type)) return;
        
        const nodesOfType = depthLayer.get(type)!;
        
        // Group by category within type
        const categoryGroups = this.groupNodesByCategory(nodesOfType);
        
        let typeY = layerY + typeIndex * 80;
        let currentX = 100;
        
        categoryGroups.forEach((categoryNodes, category) => {
          // Sort nodes within category
          const sortedNodes = categoryNodes.sort((a, b) => a.title.localeCompare(b.title));
          
          sortedNodes.forEach((node, nodeIndex) => {
            positioned.push({
              ...node,
              x: currentX,
              y: typeY,
              depth,
              clusterGroup: `${type}-${category}`
            });
            
            currentX += this.config.nodeSpacing.horizontal;
          });
          
          // Add category spacing
          currentX += this.config.nodeSpacing.category;
        });
      });
    });

    return positioned;
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