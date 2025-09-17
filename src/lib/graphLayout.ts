// NEW GRAPH LAYOUT: Advanced layout algorithms for unified career graph
// Replaces the simple hierarchical layout with sophisticated algorithms

import { type Node } from '@xyflow/react';
import { type GraphNode, type GraphEdge } from '@/lib/careerGraph';

export interface LayoutConfig {
  algorithm: 'hierarchical' | 'force' | 'circular' | 'tree' | 'focus';
  spacing: {
    nodeWidth: number;
    nodeHeight: number;
    levelGap: number;
    nodeGap: number;
  };
  direction: 'horizontal' | 'vertical';
  focusNodeId?: string;
  groupByType?: boolean;
}

export interface LayoutResult {
  nodes: Node[];
  bounds: {
    width: number;
    height: number;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  metadata: {
    algorithm: string;
    nodeCount: number;
    edgeCount: number;
    levels?: number;
    clusters?: Record<string, string[]>;
  };
}

// Default layout configuration
export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  algorithm: 'hierarchical',
  spacing: {
    nodeWidth: 250,
    nodeHeight: 120,
    levelGap: 200,
    nodeGap: 50
  },
  direction: 'horizontal',
  groupByType: true
};

// Node type styling and dimensions
export const NODE_STYLES = {
  job: {
    width: 280,
    height: 140,
    color: 'hsl(var(--primary))',
    bgColor: 'hsl(var(--primary-foreground))',
    icon: '💼'
  },
  skill: {
    width: 200,
    height: 100,
    color: 'hsl(var(--secondary))',
    bgColor: 'hsl(var(--secondary-foreground))',
    icon: '🎯'
  },
  course: {
    width: 240,
    height: 110,
    color: 'hsl(var(--accent))',
    bgColor: 'hsl(var(--accent-foreground))',
    icon: '📚'
  },
  project: {
    width: 260,
    height: 120,
    color: 'hsl(var(--destructive))',
    bgColor: 'hsl(var(--destructive-foreground))',
    icon: '🛠️'
  },
  certification: {
    width: 220,
    height: 100,
    color: 'hsl(var(--warning))',
    bgColor: 'hsl(var(--warning-foreground))',
    icon: '🏆'
  },
  step: {
    width: 200,
    height: 90,
    color: 'hsl(var(--muted))',
    bgColor: 'hsl(var(--muted-foreground))',
    icon: '📋'
  }
};

// Main layout engine
export class GraphLayoutEngine {
  private nodes: GraphNode[] = [];
  private edges: GraphEdge[] = [];
  private config: LayoutConfig = DEFAULT_LAYOUT_CONFIG;

  constructor(nodes: GraphNode[], edges: GraphEdge[], config?: Partial<LayoutConfig>) {
    this.nodes = nodes;
    this.edges = edges;
    this.config = { ...DEFAULT_LAYOUT_CONFIG, ...config };
  }

  // Calculate layout based on algorithm
  calculateLayout(): LayoutResult {
    console.log(`📐 Calculating ${this.config.algorithm} layout for ${this.nodes.length} nodes`);

    switch (this.config.algorithm) {
      case 'hierarchical':
        return this.calculateHierarchicalLayout();
      case 'force':
        return this.calculateForceDirectedLayout();
      case 'circular':
        return this.calculateCircularLayout();
      case 'tree':
        return this.calculateTreeLayout();
      case 'focus':
        return this.calculateFocusLayout();
      default:
        return this.calculateHierarchicalLayout();
    }
  }

  // Hierarchical layout - organized by levels and dependencies
  private calculateHierarchicalLayout(): LayoutResult {
    console.log('🏗️ Calculating hierarchical layout...');

    // Build dependency graph
    const dependencyMap = new Map<string, Set<string>>();
    const reverseDependencyMap = new Map<string, Set<string>>();

    // Initialize maps
    this.nodes.forEach(node => {
      const key = `${node.type}:${node.id}`;
      dependencyMap.set(key, new Set());
      reverseDependencyMap.set(key, new Set());
    });

    // Build dependency relationships
    this.edges.forEach(edge => {
      if (['requires', 'prerequisite'].includes(edge.edge_type)) {
        const fromKey = `${edge.from_type}:${edge.from_id}`;
        const toKey = `${edge.to_type}:${edge.to_id}`;
        
        dependencyMap.get(toKey)?.add(fromKey);
        reverseDependencyMap.get(fromKey)?.add(toKey);
      }
    });

    // Calculate levels using topological sort
    const levels = this.calculateLevels(dependencyMap);
    const maxLevel = Math.max(...levels.values());

    // Group nodes by level and type
    const levelGroups = new Map<number, Map<string, GraphNode[]>>();
    
    for (let level = 0; level <= maxLevel; level++) {
      levelGroups.set(level, new Map());
      Object.values(NODE_STYLES).forEach(style => {
        levelGroups.get(level)!.set(style.icon, []);
      });
    }

    this.nodes.forEach(node => {
      const key = `${node.type}:${node.id}`;
      const level = levels.get(key) || 0;
      const typeGroup = levelGroups.get(level)?.get(NODE_STYLES[node.type]?.icon || '📋');
      if (typeGroup) {
        typeGroup.push(node);
      }
    });

    // Position nodes
    const layoutNodes: Node[] = [];
    let globalY = 0;

    for (let level = 0; level <= maxLevel; level++) {
      const levelGroup = levelGroups.get(level)!;
      let levelX = level * this.config.spacing.levelGap;
      let maxLevelHeight = 0;
      let levelY = globalY;

      // Position each type group within the level
      for (const [typeIcon, nodes] of levelGroup) {
        if (nodes.length === 0) continue;

        const nodeStyle = Object.values(NODE_STYLES).find(s => s.icon === typeIcon);
        if (!nodeStyle) continue;

        // Calculate group dimensions
        const groupHeight = nodes.length * (nodeStyle.height + this.config.spacing.nodeGap);
        maxLevelHeight = Math.max(maxLevelHeight, groupHeight);

        // Position nodes in this type group
        nodes.forEach((node, index) => {
          const nodeY = levelY + index * (nodeStyle.height + this.config.spacing.nodeGap);
          
          layoutNodes.push({
            id: `${node.type}:${node.id}`,
            type: node.type,
            position: { x: levelX, y: nodeY },
            data: {
              ...node,
              style: nodeStyle
            },
            style: {
              width: nodeStyle.width,
              height: nodeStyle.height,
            }
          });
        });

        levelY += groupHeight + this.config.spacing.nodeGap * 2;
      }

      globalY += maxLevelHeight + this.config.spacing.levelGap;
    }

    // Calculate bounds
    const bounds = this.calculateBounds(layoutNodes);

    return {
      nodes: layoutNodes,
      bounds,
      metadata: {
        algorithm: 'hierarchical',
        nodeCount: this.nodes.length,
        edgeCount: this.edges.length,
        levels: maxLevel + 1
      }
    };
  }

  // Force-directed layout using physics simulation
  private calculateForceDirectedLayout(): LayoutResult {
    console.log('⚡ Calculating force-directed layout...');

    const nodes: Node[] = this.nodes.map((node, index) => {
      const style = NODE_STYLES[node.type] || NODE_STYLES.step;
      
      return {
        id: `${node.type}:${node.id}`,
        type: node.type,
        position: {
          x: Math.random() * 1000,
          y: Math.random() * 1000
        },
        data: {
          ...node,
          style
        },
        style: {
          width: style.width,
          height: style.height,
        }
      };
    });

    // Simple force simulation
    const iterations = 50;
    const repulsionForce = 50000;
    const attractionForce = 0.1;
    const damping = 0.9;

    for (let iter = 0; iter < iterations; iter++) {
      // Apply forces
      nodes.forEach(node => {
        let fx = 0, fy = 0;

        // Repulsion from other nodes
        nodes.forEach(other => {
          if (node.id === other.id) return;
          
          const dx = node.position.x - other.position.x;
          const dy = node.position.y - other.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy) + 1;
          
          const force = repulsionForce / (distance * distance);
          fx += (dx / distance) * force;
          fy += (dy / distance) * force;
        });

        // Attraction along edges
        this.edges.forEach(edge => {
          const isSource = node.id === `${edge.from_type}:${edge.from_id}`;
          const isTarget = node.id === `${edge.to_type}:${edge.to_id}`;
          
          if (isSource || isTarget) {
            const otherId = isSource ? `${edge.to_type}:${edge.to_id}` : `${edge.from_type}:${edge.from_id}`;
            const other = nodes.find(n => n.id === otherId);
            
            if (other) {
              const dx = other.position.x - node.position.x;
              const dy = other.position.y - node.position.y;
              const distance = Math.sqrt(dx * dx + dy * dy) + 1;
              
              fx += dx * attractionForce;
              fy += dy * attractionForce;
            }
          }
        });

        // Apply velocity with damping
        node.position.x += fx * damping;
        node.position.y += fy * damping;
      });
    }

    const bounds = this.calculateBounds(nodes);

    return {
      nodes,
      bounds,
      metadata: {
        algorithm: 'force',
        nodeCount: this.nodes.length,
        edgeCount: this.edges.length
      }
    };
  }

  // Circular layout - arrange nodes in circles by type
  private calculateCircularLayout(): LayoutResult {
    console.log('🔄 Calculating circular layout...');

    const nodesByType = new Map<string, GraphNode[]>();
    
    // Group nodes by type
    this.nodes.forEach(node => {
      if (!nodesByType.has(node.type)) {
        nodesByType.set(node.type, []);
      }
      nodesByType.get(node.type)!.push(node);
    });

    const layoutNodes: Node[] = [];
    const centerX = 500;
    const centerY = 500;
    const radiusIncrement = 200;
    let currentRadius = 150;

    // Place each type in concentric circles
    for (const [type, typeNodes] of nodesByType) {
      const style = NODE_STYLES[type] || NODE_STYLES.step;
      const angleIncrement = (2 * Math.PI) / typeNodes.length;

      typeNodes.forEach((node, index) => {
        const angle = index * angleIncrement;
        const x = centerX + currentRadius * Math.cos(angle);
        const y = centerY + currentRadius * Math.sin(angle);

        layoutNodes.push({
          id: `${node.type}:${node.id}`,
          type: node.type,
          position: { x, y },
          data: {
            ...node,
            style
          },
          style: {
            width: style.width,
            height: style.height,
          }
        });
      });

      currentRadius += radiusIncrement;
    }

    const bounds = this.calculateBounds(layoutNodes);

    return {
      nodes: layoutNodes,
      bounds,
      metadata: {
        algorithm: 'circular',
        nodeCount: this.nodes.length,
        edgeCount: this.edges.length
      }
    };
  }

  // Tree layout - hierarchical tree structure
  private calculateTreeLayout(): LayoutResult {
    console.log('🌳 Calculating tree layout...');
    
    // Find root nodes (no incoming prerequisite edges)
    const rootNodes = this.nodes.filter(node => {
      const nodeKey = `${node.type}:${node.id}`;
      return !this.edges.some(edge => 
        edge.edge_type === 'prerequisite' && 
        `${edge.to_type}:${edge.to_id}` === nodeKey
      );
    });

    if (rootNodes.length === 0) {
      // Fallback to hierarchical if no clear root
      return this.calculateHierarchicalLayout();
    }

    const layoutNodes: Node[] = [];
    const visited = new Set<string>();
    
    // Recursive tree positioning
    const positionTree = (node: GraphNode, x: number, y: number, level: number): number => {
      const nodeKey = `${node.type}:${node.id}`;
      if (visited.has(nodeKey)) return x;
      
      visited.add(nodeKey);
      const style = NODE_STYLES[node.type] || NODE_STYLES.step;
      
      layoutNodes.push({
        id: nodeKey,
        type: node.type,
        position: { x, y },
        data: { ...node, style },
        style: {
          width: style.width,
          height: style.height,
        }
      });

      // Position children using prerequisite edges (consistent with root finding)
      const children = this.edges
        .filter(edge => 
          edge.edge_type === 'prerequisite' && 
          `${edge.from_type}:${edge.from_id}` === nodeKey
        )
        .map(edge => this.nodes.find(n => `${n.type}:${n.id}` === `${edge.to_type}:${edge.to_id}`))
        .filter(Boolean) as GraphNode[];

      let childX = x;
      children.forEach(child => {
        childX = positionTree(
          child, 
          childX, 
          y + this.config.spacing.levelGap, 
          level + 1
        );
        childX += this.config.spacing.nodeGap;
      });

      return Math.max(x + style.width + this.config.spacing.nodeGap, childX);
    };

    // Process ALL root nodes, spacing them horizontally
    let currentX = 0;
    rootNodes.forEach(rootNode => {
      const treeWidth = positionTree(rootNode, currentX, 0, 0);
      currentX = treeWidth + this.config.spacing.levelGap; // Space between separate trees
    });

    const bounds = this.calculateBounds(layoutNodes);

    return {
      nodes: layoutNodes,
      bounds,
      metadata: {
        algorithm: 'tree',
        nodeCount: this.nodes.length,
        edgeCount: this.edges.length
      }
    };
  }

  // Focus layout - center on specific node with radiating connections
  private calculateFocusLayout(): LayoutResult {
    console.log('🎯 Calculating focus layout...');

    const focusNodeId = this.config.focusNodeId;
    if (!focusNodeId) {
      console.warn('No focus node specified, falling back to hierarchical');
      return this.calculateHierarchicalLayout();
    }

    const focusNode = this.nodes.find(n => `${n.type}:${n.id}` === focusNodeId);
    if (!focusNode) {
      console.warn('Focus node not found, falling back to hierarchical');
      return this.calculateHierarchicalLayout();
    }

    const layoutNodes: Node[] = [];
    const centerX = 500;
    const centerY = 500;

    // Place focus node at center
    const focusStyle = NODE_STYLES[focusNode.type] || NODE_STYLES.step;
    layoutNodes.push({
      id: focusNodeId,
      type: focusNode.type,
      position: { x: centerX, y: centerY },
      data: { ...focusNode, style: focusStyle },
      style: {
        width: focusStyle.width,
        height: focusStyle.height,
      }
    });

    // Find connected nodes
    const connectedEdges = this.edges.filter(edge => 
      `${edge.from_type}:${edge.from_id}` === focusNodeId ||
      `${edge.to_type}:${edge.to_id}` === focusNodeId
    );

    const connectedNodes = new Set<GraphNode>();
    connectedEdges.forEach(edge => {
      const otherNodeId = `${edge.from_type}:${edge.from_id}` === focusNodeId
        ? `${edge.to_type}:${edge.to_id}`
        : `${edge.from_type}:${edge.from_id}`;
      
      const otherNode = this.nodes.find(n => `${n.type}:${n.id}` === otherNodeId);
      if (otherNode) connectedNodes.add(otherNode);
    });

    // Place connected nodes in circle around focus
    const radius = 300;
    const angleIncrement = (2 * Math.PI) / connectedNodes.size;
    
    Array.from(connectedNodes).forEach((node, index) => {
      const angle = index * angleIncrement;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      const style = NODE_STYLES[node.type] || NODE_STYLES.step;

      layoutNodes.push({
        id: `${node.type}:${node.id}`,
        type: node.type,
        position: { x, y },
        data: { ...node, style },
        style: {
          width: style.width,
          height: style.height,
        }
      });
    });

    // Place remaining nodes in outer ring
    const remainingNodes = this.nodes.filter(node => 
      `${node.type}:${node.id}` !== focusNodeId && !connectedNodes.has(node)
    );

    const outerRadius = 600;
    const outerAngleIncrement = (2 * Math.PI) / Math.max(remainingNodes.length, 1);

    remainingNodes.forEach((node, index) => {
      const angle = index * outerAngleIncrement;
      const x = centerX + outerRadius * Math.cos(angle);
      const y = centerY + outerRadius * Math.sin(angle);
      const style = NODE_STYLES[node.type] || NODE_STYLES.step;

      layoutNodes.push({
        id: `${node.type}:${node.id}`,
        type: node.type,
        position: { x, y },
        data: { ...node, style },
        style: {
          width: style.width,
          height: style.height,
        }
      });
    });

    const bounds = this.calculateBounds(layoutNodes);

    return {
      nodes: layoutNodes,
      bounds,
      metadata: {
        algorithm: 'focus',
        nodeCount: this.nodes.length,
        edgeCount: this.edges.length
      }
    };
  }

  // Calculate node levels using topological sort
  private calculateLevels(dependencyMap: Map<string, Set<string>>): Map<string, number> {
    const levels = new Map<string, number>();
    const queue: string[] = [];

    // Find nodes with no dependencies (level 0)
    for (const [nodeKey, dependencies] of dependencyMap) {
      if (dependencies.size === 0) {
        levels.set(nodeKey, 0);
        queue.push(nodeKey);
      }
    }

    // Process queue, assigning levels
    while (queue.length > 0) {
      const currentKey = queue.shift()!;
      const currentLevel = levels.get(currentKey)!;

      // Find nodes that depend on current node
      for (const [nodeKey, dependencies] of dependencyMap) {
        if (dependencies.has(currentKey)) {
          dependencies.delete(currentKey);
          
          if (dependencies.size === 0) {
            levels.set(nodeKey, currentLevel + 1);
            queue.push(nodeKey);
          }
        }
      }
    }

    // Handle any remaining nodes (cycles or disconnected)
    for (const nodeKey of dependencyMap.keys()) {
      if (!levels.has(nodeKey)) {
        levels.set(nodeKey, 0);
      }
    }

    return levels;
  }

  // Calculate layout bounds
  private calculateBounds(nodes: Node[]) {
    if (nodes.length === 0) {
      return { width: 0, height: 0, minX: 0, maxX: 0, minY: 0, maxY: 0 };
    }

    const positions = nodes.map(node => ({
      x: node.position.x,
      y: node.position.y,
      width: typeof node.style?.width === 'number' ? node.style.width : 200,
      height: typeof node.style?.height === 'number' ? node.style.height : 100
    }));

    const minX = Math.min(...positions.map(p => p.x));
    const maxX = Math.max(...positions.map(p => p.x + p.width));
    const minY = Math.min(...positions.map(p => p.y));
    const maxY = Math.max(...positions.map(p => p.y + p.height));

    return {
      width: maxX - minX,
      height: maxY - minY,
      minX,
      maxX,
      minY,
      maxY
    };
  }
}

// Convenience function for calculating layouts
export function calculateGraphLayout(
  nodes: GraphNode[], 
  edges: GraphEdge[], 
  config?: Partial<LayoutConfig>
): LayoutResult {
  const engine = new GraphLayoutEngine(nodes, edges, config);
  return engine.calculateLayout();
}