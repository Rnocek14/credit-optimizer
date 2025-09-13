
import { Node, Edge } from '@xyflow/react';

// Add missing ViewMode type export
export type ViewMode = 'flow' | 'board';

interface ElkNode {
  id: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  layoutOptions?: { [key: string]: any };
}

interface ElkEdge {
  id: string;
  sources: string[];
  targets: string[];
  layoutOptions?: { [key: string]: any };
}

export async function layoutWithElk(nodes: Node[], edges: Edge[], mode: ViewMode = 'flow'): Promise<Node[]> {
  // Import ELK dynamically for better performance
  const ELK = (await import('elkjs')).default;
  const elk = new ELK();

  // For flow mode, let ELK handle layout naturally without hard constraints
  // For grid mode, use grid layout instead
  if (mode === 'board') {
    return layoutAsGrid(nodes, mode);
  }

  // Convert React Flow nodes to ELK format
  const elkNodes = nodes.map(node => {
    const width = getNodeWidth(node);
    const height = getNodeHeight(node);
    
    return {
      id: node.id,
      width,
      height,
      layoutOptions: {
        'elk.padding': '[top=10,left=10,bottom=10,right=10]'
      }
    };
  });

  // Convert React Flow edges to ELK format
  const elkEdges = edges.map(edge => ({
    id: edge.id,
    sources: [edge.source],
    targets: [edge.target]
  }));

  const graph = {
    id: "root",
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.spacing.nodeNode': '100',
      'elk.layered.spacing.nodeNodeBetweenLayers': '120',
      'elk.spacing.edgeNode': '30',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.nodePlacement.strategy': 'SIMPLE',
      'elk.separateConnectedComponents': 'false',
      'elk.padding': '[top=40,left=40,bottom=40,right=40]'
    },
    children: elkNodes,
    edges: elkEdges
  };

  try {
    const layouted = await elk.layout(graph);
    
    // Map ELK results back to React Flow nodes
    const layoutedNodes = nodes.map(node => {
      const elkNode = layouted.children?.find(n => n.id === node.id);
      
      if (elkNode) {
        return {
          ...node,
          position: { 
            x: elkNode.x ?? node.position.x, 
            y: elkNode.y ?? node.position.y 
          },
          measured: {
            width: elkNode.width,
            height: elkNode.height
          }
        };
      }
      
      return node;
    });

    return layoutedNodes;
    
  } catch (error) {
    console.error('ELK layout failed:', error);
    return createSimpleFallback(nodes);
  }
}

// Grid layout for Board mode
export function layoutAsGrid(nodes: Node[], mode: 'board'): Node[] {
  if (mode !== 'board') return nodes;

  // Year-based columns with proper spacing
  const columnWidth = 360;
  const padding = 40;
  const rowSpacing = 140;
  
  // Group nodes by year and area for better organization
  const nodesByYear = new Map<number, Node[]>();
  
  nodes.forEach(node => {
    const data = node.data as any;
    const year = data.level_year ?? 1;
    if (!nodesByYear.has(year)) {
      nodesByYear.set(year, []);
    }
    nodesByYear.get(year)!.push(node);
  });

  const layoutedNodes: Node[] = [];
  
  nodesByYear.forEach((yearNodes, year) => {
    const columnX = (year - 1) * columnWidth + padding;
    
    yearNodes.forEach((node, index) => {
      layoutedNodes.push({
        ...node,
        position: {
          x: columnX,
          y: index * rowSpacing + padding
        }
      });
    });
  });

  return layoutedNodes;
}

/**
 * Get standardized node width
 */
function getNodeWidth(node: Node): number {
  return node.type === 'blockGroup' ? 320 : 200;
}

/**
 * Get dynamic node height based on content
 */
function getNodeHeight(node: Node): number {
  if (node.type === 'blockGroup') {
    const data = node.data as any;
    const block = data.block;
    const subBlocks = data.subBlocks || [];
    
    // Base height for header and controls
    let height = 160;
    
    // Add height for courses (single column)
    const courseCount = block?.courses?.length || 0;
    height += courseCount * 70;
    
    // Add height for sub-blocks if expanded
    if (subBlocks.length > 0) {
      height += 50; // Toggle button
      height += subBlocks.length * 60; // Each sub-block
    }
    
    // Minimum height with reasonable buffer
    return Math.max(height, 250);
  }
  
  return 100; // Terminal nodes
}

/**
 * Simple fallback layout when ELK fails
 */
function createSimpleFallback(nodes: Node[]): Node[] {
  const columnWidth = 360;
  const rowSpacing = 200;
  const padding = 40;
  
  return nodes.map((node, index) => {
    const col = Math.floor(index / 5); // 5 nodes per column
    const row = index % 5;
    
    return {
      ...node,
      position: {
        x: col * columnWidth + padding,
        y: row * rowSpacing + padding
      }
    };
  });
}
