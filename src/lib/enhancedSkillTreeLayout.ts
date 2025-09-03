// Enhanced Skill Tree Layout Engine
// Implements semantic clustering, category grouping, and intelligent positioning

type NodeId = string;

// Cycle-tolerant Kahn topological sort with grid fallback
function topoWithCycleCut(nodes: LayoutNode[], edges: LayoutEdge[]) {
  const out: PositionedNode[] = [];
  const idToNode = new Map(nodes.map(n => [n.id, n]));
  const indeg = new Map<NodeId, number>();
  const adj = new Map<NodeId, NodeId[]>();

  nodes.forEach(n => { indeg.set(n.id, 0); adj.set(n.id, []); });
  edges.forEach(e => {
    if (!idToNode.has(e.source) || !idToNode.has(e.target)) return;
    indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
    adj.get(e.source)!.push(e.target);
  });

  const q: NodeId[] = [];
  indeg.forEach((d, id) => { if (d === 0) q.push(id); });

  const order: NodeId[] = [];
  while (q.length) {
    const u = q.shift()!;
    order.push(u);
    for (const v of adj.get(u)!) {
      indeg.set(v, (indeg.get(v) ?? 0) - 1);
      if ((indeg.get(v) ?? 0) === 0) q.push(v);
    }
  }

  // If we didn't visit everything, we have cycles.
  const hadCycles = order.length !== nodes.length;

  if (hadCycles) {
    // break cycles deterministically: cut any remaining incoming edge per node
    const remaining = nodes.map(n => n.id).filter(id => !order.includes(id));
    for (const id of remaining) {
      // pretend this node is now a root for layout purposes
      order.push(id);
    }
  }

  // Pack ordered nodes into a simple layered grid (category/level aware if you have it)
  const COLS = 6, X0 = 60, Y0 = 60, DX = 220, DY = 160;
  const pos = new Map<NodeId, {x:number,y:number}>();
  order.forEach((id, i) => {
    pos.set(id, { x: X0 + (i % COLS) * DX, y: Y0 + Math.floor(i / COLS) * DY });
  });

  const placed = nodes.map(n => ({
    id: n.id,
    x: pos.get(n.id)!.x,
    y: pos.get(n.id)!.y,
    title: n.title,
    type: n.type,
    clusterGroup: n.category ?? 'uncategorized',
    depth: 0,
  }));

  return { placed, hadCycles };
}

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

// Layout configuration with strict depth limits
const MAX_DEPTH = 10;           // Never exceed this depth
const MAX_CANVAS_HEIGHT = 2000; // Hard ceiling for layout
const LAYER_GAP = 180;          // Consistent spacing between layers
const ORPHAN_ISLAND_Y = 1600;   // Dedicated area for orphan nodes

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

export interface LayoutResult {
  nodes: PositionedNode[];
  hadCycles: boolean;
}

export class EnhancedSkillTreeLayout {
  private nodes: LayoutNode[];
  private edges: LayoutEdge[];
  private config: LayoutConfig;
  private categoryColors: Map<string, string>;
  private depthCache: Map<string, number>;
  private hadCycles: boolean = false;

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
    this.hadCycles = false;
    
    // Input validation
    if (!this.nodes || this.nodes.length === 0) {
      console.warn('⚠️ No nodes provided for layout');
      return [];
    }

    // Validate edges reference existing nodes
    const nodeIds = new Set(this.nodes.map(n => n.id));
    const validEdges = this.edges.filter(edge => 
      nodeIds.has(edge.source) && nodeIds.has(edge.target)
    );
    
    if (validEdges.length !== this.edges.length) {
      console.warn(`🔧 Filtered ${this.edges.length - validEdges.length} invalid edges`);
      this.edges = validEdges;
    }
    
    let result: PositionedNode[];
    try {
      switch (this.config.algorithm) {
        case 'semantic-hierarchy':
          result = this.calculateSemanticHierarchy();
          break;
        case 'category-cluster':
          result = this.calculateCategoryCluster();
          break;
        case 'goal-focused':
          result = this.calculateGoalFocused();
          break;
        case 'progressive-disclosure':
          result = this.calculateProgressiveDisclosure();
          break;
        default:
          result = this.calculateSemanticHierarchy();
      }
    } catch (error) {
      console.error('❌ Layout algorithm failed, falling back to grid layout:', error);
      result = this.createSafeGridLayout();
    }

    // Guarantee every input node yields a positioned node
    const missingNodes = this.nodes.filter(n => !result.find(r => r.id === n.id));
    if (missingNodes.length > 0) {
      console.warn(`🔧 Adding ${missingNodes.length} missing nodes to layout`);
      const maxY = Math.max(...result.map(n => n.y)) + 200;
      // Create orphan island with grid layout
      const orphanCols = 8;
      missingNodes.forEach((node, i) => {
        const col = i % orphanCols;
        const row = Math.floor(i / orphanCols);
        result.push({
          ...node,
          x: 100 + (col * 220),
          y: ORPHAN_ISLAND_Y + (row * 120),
          depth: MAX_DEPTH,
          clusterGroup: 'orphan'
        });
      });
    }

    // Enhanced debug logging
    const orphanCount = result.filter(n => n.clusterGroup === 'orphan').length;
    const cycleCount = result.filter(n => n.depth === MAX_DEPTH && n.clusterGroup !== 'orphan').length;
    const minY = Math.min(...result.map(n => n.y));
    const maxY = Math.max(...result.map(n => n.y));
    
    console.info('[layout]', { 
      orphans: orphanCount, 
      cycleNodes: cycleCount, 
      clamped: result.filter(n => n.depth >= MAX_DEPTH).length,
      span: { minY, maxY }
    });

    if (this.hadCycles) {
      console.warn('🔄 Layout cycles were detected and handled with heuristic depth assignment');
    }

    return result;
  }

  private createSafeGridLayout(): PositionedNode[] {
    console.log('🔧 Creating safe grid layout fallback');
    const result: PositionedNode[] = [];
    const COLS = 6;
    const X_OFFSET = 100;
    const Y_OFFSET = 100;
    const CELL_WIDTH = 220;
    const CELL_HEIGHT = 160;

    this.nodes.forEach((node, index) => {
      const col = index % COLS;
      const row = Math.floor(index / COLS);
      
      result.push({
        ...node,
        x: X_OFFSET + col * CELL_WIDTH,
        y: Y_OFFSET + row * CELL_HEIGHT,
        depth: 0,
        clusterGroup: node.category || 'default'
      });
    });

    return result;
  }

  public getHadCycles(): boolean {
    return this.hadCycles;
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
    const cycleNodes = new Set<string>();
    let recursionCount = 0;
    const MAX_RECURSION = 1000; // Prevent infinite recursion

    const calculateDepth = (nodeId: string, currentDepth: number = 0): number => {
      // Prevent infinite recursion
      if (++recursionCount > MAX_RECURSION) {
        console.error(`🚨 Max recursion exceeded for node ${nodeId}`);
        depths.set(nodeId, MAX_DEPTH);
        return MAX_DEPTH;
      }

      // Already calculated
      if (depths.has(nodeId)) return depths.get(nodeId)!;
      
      // Circular dependency detected
      if (visiting.has(nodeId)) {
        console.warn(`🔄 Circular dependency detected for node ${nodeId}`);
        cycleNodes.add(nodeId);
        this.hadCycles = true;
        
        // Break the cycle by assigning a safe depth
        const safeDepth = Math.min(currentDepth, MAX_DEPTH - 1);
        depths.set(nodeId, safeDepth);
        return safeDepth;
      }

      // Depth limit exceeded
      if (currentDepth >= MAX_DEPTH) {
        console.warn(`⚠️ Depth limit reached for node ${nodeId}`);
        depths.set(nodeId, MAX_DEPTH);
        return MAX_DEPTH;
      }

      visiting.add(nodeId);
      
      try {
        // Find all dependencies (incoming edges)
        const dependencies = this.edges.filter(e => e.target === nodeId);
        
        if (dependencies.length === 0) {
          // Root node
          depths.set(nodeId, 0);
          visiting.delete(nodeId);
          visited.add(nodeId);
          return 0;
        }

        // Calculate max depth of dependencies + 1
        let maxDepth = 0;
        for (const dep of dependencies) {
          // Skip if source node doesn't exist
          if (!this.nodes.find(n => n.id === dep.source)) continue;
          
          const depthValue = calculateDepth(dep.source, currentDepth + 1);
          maxDepth = Math.max(maxDepth, depthValue);
        }
        
        const finalDepth = Math.min(maxDepth + 1, MAX_DEPTH);
        depths.set(nodeId, finalDepth);
        visiting.delete(nodeId);
        visited.add(nodeId);
        
        return finalDepth;
      } catch (error) {
        console.error(`❌ Error calculating depth for node ${nodeId}:`, error);
        depths.set(nodeId, MAX_DEPTH);
        visiting.delete(nodeId);
        return MAX_DEPTH;
      }
    };

    // Process remaining nodes safely
    this.nodes.forEach(node => {
      if (!visited.has(node.id) && !depths.has(node.id)) {
        try {
          recursionCount = 0; // Reset for each node
          const depth = calculateDepth(node.id, 0);
          
          // Check if node is truly orphaned (no incoming or outgoing edges)
          const hasEdges = this.edges.some(e => 
            e.source === node.id || e.target === node.id
          );
          
          if (!hasEdges) {
            console.log(`🏝️ Orphan node detected: ${node.title} (${node.id})`);
            depths.set(node.id, Math.min(2, MAX_DEPTH)); // Place orphans early in layout
          }
        } catch (error) {
          console.error(`❌ Failed to process node ${node.id}:`, error);
          depths.set(node.id, MAX_DEPTH);
        }
      }
    });

    // Report cycle handling results
    if (cycleNodes.size > 0) {
      console.warn(`🔄 Handled ${cycleNodes.size} nodes in cycles:`, Array.from(cycleNodes));
    }

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
      const depth = Math.min(depthMap.get(node.id) ?? MAX_DEPTH, MAX_DEPTH); // Cap all depths
      
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
      
      // Clamped Y positioning to keep nodes visible
      const baseY = Math.min(120 + depth * LAYER_GAP, MAX_CANVAS_HEIGHT - 400);
      
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

// Utility function for easy usage with bulletproof fallback
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

  try {
    const layout = new EnhancedSkillTreeLayout(nodes, edges, defaultConfig);
    const result = layout.calculateLayout();
    
    // Check for failure conditions
    if (!Array.isArray(result) || result.length === 0) {
      console.warn('🪜 Enhanced returned 0 → using Kahn fallback');
      return topoWithCycleCut(nodes, edges).placed;
    }
    
    // Expose hadCycles for caller logging
    if (layout.getHadCycles()) {
      console.warn('🔄 Layout cycles were detected and handled with heuristic depth assignment');
    }
    
    return result;
  } catch (err) {
    console.error('❌ Enhanced layout threw → using Kahn fallback', err);
    return topoWithCycleCut(nodes, edges).placed;
  }
}