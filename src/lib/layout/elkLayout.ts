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
      width: node.measured?.width ?? (node.type === 'group' ? 300 : 200),
      height: node.measured?.height ?? (node.type === 'group' ? 180 : 100)
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
      result.children?.map((child: any) => [child.id, { x: child.x, y: child.y }])
    );

    return nodes.map(node => ({
      ...node,
      position: positionMap.get(node.id) ?? node.position
    }));
  } catch (error) {
    console.error('ELK layout failed:', error);
    return nodes; // Return original nodes if layout fails
  }
}

// Grid layout for Board mode
export function layoutAsGrid(nodes: Node[], mode: 'board'): Node[] {
  if (mode !== 'board') return nodes;

  const yearColumns = [1, 2, 3, 4];
  const areaRows = ['foundation', 'core', 'specialization', 'software_engineering', 'capstone'];
  
  const columnWidth = 320;
  const rowHeight = 200;
  const padding = 20;

  return nodes.map(node => {
    if (node.type !== 'group') return node;
    
    const data = node.data as any;
    const yearIndex = yearColumns.indexOf(data.level_year as number) ?? 0;
    const areaIndex = areaRows.indexOf(data.area as string) ?? 0;

    return {
      ...node,
      position: {
        x: yearIndex * columnWidth + padding,
        y: areaIndex * rowHeight + padding
      }
    };
  });
}