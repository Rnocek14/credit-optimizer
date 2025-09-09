import ELK from 'elkjs/lib/elk.bundled.js';
import { Node, Edge } from '@xyflow/react';

interface ElkNode {
  id: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
}

interface ElkEdge {
  id: string;
  sources: string[];
  targets: string[];
}

export async function layoutWithElk(nodes: Node[], edges: Edge[]): Promise<Node[]> {
  const elk = new ELK();
  
  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.layered.crossingMinimization.strategy': 'INTERACTIVE',
      'elk.spacing.nodeNode': '40',
      'elk.spacing.edgeNode': '20',
      'elk.layered.spacing.nodeNodeBetweenLayers': '80',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.padding': '[top=20,left=20,bottom=20,right=20]'
    },
    children: nodes.map((node): ElkNode => ({
      id: node.id,
      width: node.measured?.width ?? (node.type === 'blockGroup' ? 300 : 200), // Fix: check for 'blockGroup'
      height: node.measured?.height ?? (node.type === 'blockGroup' ? 180 : 100)
    })),
    edges: edges.map((edge): ElkEdge => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target]
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

  const yearColumns = [1, 2, 3, 4];
  const areaRows = ['foundation', 'core', 'specialization', 'software_engineering', 'capstone'];
  
  const columnWidth = 320;
  const rowHeight = 220;
  const padding = 20;

  return nodes.map(node => {
    if (node.type !== 'blockGroup') return node; // Fix: check for 'blockGroup' not 'group'
    
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