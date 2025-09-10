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

export async function layoutWithElk(nodes: Node[], edges: Edge[], nodeDimensions?: Map<string, any>): Promise<Node[]> {
  const elk = new ELK();
  
  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.layered.considerModelOrder': 'NODES_AND_EDGES',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.spacing.nodeNode': '32',                 // Reduced - collision resolver will handle spacing
      'elk.spacing.nodeNodeBetweenLayers': '80',    // Reduced for tighter initial layout
      'elk.spacing.edgeNode': '24',                 // Adequate edge clearance
      'elk.padding': '[top=24,left=24,bottom=24,right=24]'
    },
    children: nodes.map((node): ElkNode => {
      const dimensions = nodeDimensions?.get(node.id);
      const estimatedHeight = estimateNodeHeight(node);
      
      return {
        id: node.id,
        width: dimensions?.width ?? node.measured?.width ?? (node.type === 'blockGroup' ? 320 : 200),
        height: dimensions?.height ?? node.measured?.height ?? estimatedHeight,
        layoutOptions: {
          'elk.portConstraints': 'FIXED_SIDE'
        }
      };
    }),
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