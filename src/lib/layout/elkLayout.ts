import ELK from 'elkjs/lib/elk.bundled.js';
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

export async function layoutWithElk(nodes: Node[], edges: Edge[]): Promise<Node[]> {
  const elk = new ELK();
  
  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.layered.considerModelOrder': 'NODES_AND_EDGES',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.spacing.nodeNode': '80',                // Increased for better visual breathing room
      'elk.spacing.nodeNodeBetweenLayers': '120',   // Increased for clearer layer separation  
      'elk.spacing.edgeNode': '32',                // Increased for better edge-node clearance
      'elk.padding': '[top=24,left=24,bottom=24,right=24]'
    },
    children: nodes.map((node): ElkNode => ({
      id: node.id,
      width: node.measured?.width ?? (node.type === 'blockGroup' ? 320 : 200),
      height: node.measured?.height ?? (node.type === 'blockGroup' ? 200 : 100),
      layoutOptions: {
        'elk.portConstraints': 'FIXED_SIDE'
      }
    })),
    edges: edges.map((edge): ElkEdge => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
      layoutOptions: { 
        'elk.edge.type': 'ORTHOGONAL' 
      }
    }))
  };

  try {
    const result = await elk.layout(graph);
    const positionMap = new Map(
      result.children?.map((child: any) => [child.id, { x: child.x ?? 0, y: child.y ?? 0 }]) ?? []
    );

    return nodes.map(node => ({
      ...node,
      position: positionMap.get(node.id) ?? node.position ?? { x: 0, y: 0 }
    }));
  } catch (error) {
    console.error('ELK layout failed:', error);
    // Return nodes with fallback positions
    return nodes.map((node, index) => ({
      ...node,
      position: node.position ?? { x: (index % 3) * 320, y: Math.floor(index / 3) * 220 }
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