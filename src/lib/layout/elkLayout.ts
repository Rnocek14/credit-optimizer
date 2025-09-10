import { Node, Edge } from '@xyflow/react';

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

export async function layoutWithElk(nodes: Node[], edges: Edge[], nodeDimensions?: Map<string, any>): Promise<Node[]> {
  // Import ELK dynamically for better performance
  const ELK = (await import('elkjs')).default;
  const elk = new ELK();

  // Convert React Flow nodes to ELK format with accurate dimensions
  const elkNodes = nodes.map(node => {
    const dimensions = nodeDimensions?.get(node.id);
    const width = dimensions?.width ?? (node.type === 'blockGroup' ? 320 : 200);
    const height = dimensions?.height ?? estimateNodeHeight(node);
    
    return {
      id: node.id,
      width,
      height,
      // Store original node data for reference
      layoutOptions: {
        'elk.padding': '[top=8,left=8,bottom=8,right=8]'
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
      'elk.spacing.nodeNode': '48', // Increased node spacing
      'elk.layered.spacing.nodeNodeBetweenLayers': '120', // Increased layer spacing
      'elk.spacing.edgeNode': '32',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX', // Better placement
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
      'elk.separateConnectedComponents': 'false',
      'elk.padding': '[top=20,left=20,bottom=20,right=20]'
    },
    children: elkNodes,
    edges: elkEdges
  };

  try {
    const layouted = await elk.layout(graph);
    
    return nodes.map(node => {
      const elkNode = layouted.children?.find(n => n.id === node.id);
      
      if (elkNode) {
        return {
          ...node,
          position: { 
            x: elkNode.x ?? node.position.x, 
            y: elkNode.y ?? node.position.y 
          },
          // Store measured dimensions for collision detection
          measured: {
            width: elkNode.width,
            height: elkNode.height
          }
        };
      }
      
      return node;
    });
  } catch (error) {
    console.error('ELK layout failed:', error);
    // Return nodes with improved fallback positions
    return nodes.map((node, index) => ({
      ...node,
      position: { 
        x: (index % 3) * 360 + 40, 
        y: Math.floor(index / 3) * 280 + 40 
      }
    }));
  }
}

// Grid layout for Board mode
export function layoutAsGrid(nodes: Node[], mode: 'board'): Node[] {
  if (mode !== 'board') return nodes;

  // Updated area mapping to include new areas from enhanced seed data
  const yearColumns = [1, 2, 3, 4];
  const areaRows = [
    'foundation', 
    'mathematics', 
    'general_education', 
    'core', 
    'specialization', 
    'software_engineering', 
    'capstone'
  ];
  
  const columnWidth = 320;
  const rowHeight = 200; // Reduced to fit more rows
  const padding = 20;

  return nodes.map(node => {
    if (node.type !== 'blockGroup') return node;
    
    const data: any = node.data;
    const yearIndex = Math.max(0, yearColumns.indexOf(data.level_year));
    const areaIndex = Math.max(0, areaRows.indexOf(data.area));

    return {
      ...node,
      position: {
        x: yearIndex * columnWidth + padding,
        y: areaIndex * rowHeight + padding
      }
    };
  });
}

/**
 * Smart height estimation for ELK layout
 */
function estimateNodeHeight(node: Node): number {
  if (node.type === 'blockGroup') {
    const data = node.data as any;
    const baseHeight = 120; // Header + progress
    const courseCount = data.block?.courses?.length || 3;
    const subBlockCount = data.subBlocks?.length || 0;
    
    // More accurate height estimation
    return baseHeight + (courseCount * 60) + (subBlockCount * 80);
  }
  return 100;
}