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
  // Import ELK dynamically for better performance
  const ELK = (await import('elkjs')).default;
  const elk = new ELK();

  // Group nodes by year to create year-based columns
  const nodesByYear = new Map<number, Node[]>();
  nodes.forEach(node => {
    const data = node.data as any;
    const year = data.level_year ?? 1;
    if (!nodesByYear.has(year)) {
      nodesByYear.set(year, []);
    }
    nodesByYear.get(year)!.push(node);
  });

  // Convert React Flow nodes to ELK format with year-based constraints
  const elkNodes = nodes.map(node => {
    const data = node.data as any;
    const year = data.level_year ?? 1;
    const width = node.type === 'blockGroup' ? 320 : 200;
    const height = estimateNodeHeight(node);
    
    return {
      id: node.id,
      width,
      height,
      // Use year-based positioning hints for ELK
      layoutOptions: {
        'elk.padding': '[top=12,left=12,bottom=12,right=12]',
        // Constrain nodes to their year column
        'elk.position': `(${(year - 1) * 400 + 20}, ${data.sortOrder * 200 + 20})`
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
      'elk.spacing.nodeNode': '60',  // Generous horizontal spacing
      'elk.layered.spacing.nodeNodeBetweenLayers': '140', // Generous vertical spacing
      'elk.spacing.edgeNode': '40',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF', // Better for column alignment
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
      'elk.separateConnectedComponents': 'false',
      'elk.padding': '[top=40,left=40,bottom=40,right=40]',
      // Force respect of year-based positioning
      'elk.layered.layering.strategy': 'LONGEST_PATH'
    },
    children: elkNodes,
    edges: elkEdges
  };

  try {
    const layouted = await elk.layout(graph);
    
    // Apply year-based column constraints to ELK output
    const layoutedNodes = nodes.map(node => {
      const elkNode = layouted.children?.find(n => n.id === node.id);
      const data = node.data as any;
      const year = data.level_year ?? 1;
      
      if (elkNode) {
        // Force year-based column positioning
        const yearColumns = [80, 440, 800, 1160]; // Year 1-4 columns with 320px width + 40px spacing
        const columnX = yearColumns[year - 1] ?? elkNode.x;
        
        return {
          ...node,
          position: { 
            x: columnX, 
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

    // Simple collision detection and resolution
    return resolveSimpleCollisions(layoutedNodes);
    
  } catch (error) {
    console.error('ELK layout failed:', error);
    return createYearBasedFallback(nodes);
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
 * Simple and reliable height estimation
 */
function estimateNodeHeight(node: Node): number {
  if (node.type === 'blockGroup') {
    const data = node.data as any;
    const baseHeight = 140; // Header + progress + padding
    const courseCount = data.block?.courses?.length || 3;
    const subBlockCount = data.subBlocks?.length || 0;
    
    return baseHeight + (courseCount * 56) + (subBlockCount * 72);
  }
  return 120;
}

/**
 * Simple collision resolution without complex lane logic
 */
function resolveSimpleCollisions(nodes: Node[]): Node[] {
  const resolvedNodes = [...nodes];
  
  // Sort nodes by Y position to resolve from top to bottom
  resolvedNodes.sort((a, b) => a.position.y - b.position.y);
  
  for (let i = 0; i < resolvedNodes.length; i++) {
    for (let j = i + 1; j < resolvedNodes.length; j++) {
      const node1 = resolvedNodes[i];
      const node2 = resolvedNodes[j];
      
      // Check for overlap
      const rect1 = getNodeBounds(node1);
      const rect2 = getNodeBounds(node2);
      
      if (hasOverlap(rect1, rect2)) {
        // Move the lower node down to avoid overlap
        const clearanceY = rect1.y + rect1.height + 24; // 24px spacing
        if (node2.position.y < clearanceY) {
          node2.position.y = clearanceY;
        }
      }
    }
  }
  
  return resolvedNodes;
}

/**
 * Get node bounds for collision detection
 */
function getNodeBounds(node: Node) {
  const width = node.measured?.width || (node.type === 'blockGroup' ? 320 : 200);
  const height = node.measured?.height || estimateNodeHeight(node);
  
  return {
    x: node.position.x,
    y: node.position.y,
    width,
    height
  };
}

/**
 * Check if two rectangles overlap
 */
function hasOverlap(rect1: any, rect2: any): boolean {
  return !(rect1.x + rect1.width < rect2.x || 
           rect2.x + rect2.width < rect1.x || 
           rect1.y + rect1.height < rect2.y || 
           rect2.y + rect2.height < rect1.y);
}

/**
 * Year-based fallback layout when ELK fails
 */
function createYearBasedFallback(nodes: Node[]): Node[] {
  const yearColumns = [80, 440, 800, 1160];
  const nodesByYear = new Map<number, Node[]>();
  
  // Group nodes by year
  nodes.forEach(node => {
    const data = node.data as any;
    const year = data.level_year ?? 1;
    if (!nodesByYear.has(year)) {
      nodesByYear.set(year, []);
    }
    nodesByYear.get(year)!.push(node);
  });
  
  return nodes.map(node => {
    const data = node.data as any;
    const year = data.level_year ?? 1;
    const yearNodes = nodesByYear.get(year) || [];
    const nodeIndex = yearNodes.findIndex(n => n.id === node.id);
    
    return {
      ...node,
      position: {
        x: yearColumns[year - 1] ?? 80,
        y: nodeIndex * 200 + 40 // Stack vertically with spacing
      }
    };
  });
}