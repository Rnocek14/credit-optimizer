import { Node } from '@xyflow/react';

export interface GridLayoutConfig {
  colWidth: number;
  baseY: number;
  yearSpacing: number;
  trackLaneSpacing: number;
}

export interface GridLayoutOpts extends GridLayoutConfig {
  columnOrderBySlug?: { [slug: string]: number };
  trackAnchorsByLane?: { [lane: number]: { se?: number; ds?: number; sharedMax?: number } };
  reservedColsByLane?: { [lane: number]: number[] };
}

const DEFAULT_GRID_CONFIG: GridLayoutConfig = {
  colWidth: 540,
  baseY: 100,
  yearSpacing: 400,
  trackLaneSpacing: 300
};

/**
 * PR-A: Single deterministic year-grid layout system
 * Replaces cleanTreeLayout, comparisonLayout, and other competing systems
 * Works in both compare and single-track modes
 */
export function applyYearGridLayout(
  nodes: Node[], 
  isCompare: boolean = false,
  isSingleTrack: boolean = false,
  activeTrack: 'software-engineering' | 'data-science' | null = null,
  config: Partial<GridLayoutOpts> = {}
): Node[] {
  console.log('[Layout][Grid] Starting year-grid layout:', {
    nodeCount: nodes.length,
    isCompare,
    isSingleTrack,
    activeTrack,
    sampleNode: nodes[0]?.id
  });

  const opts: GridLayoutOpts = { ...DEFAULT_GRID_CONFIG, ...config };

  // Extract level_year from node data
  const getLevelYear = (node: Node): number => {
    const data = node.data as any;
    return data?.block?.level_year || 
           data?.level_year || 
           1;
  };

  const getTrackId = (node: Node): string | null => {
    const data = node.data as any;
    return data?.block?.track_id || 
           data?.phaseA?.trackId || 
           null;
  };

  const getSlug = (node: Node): string => {
    const data = node.data as any;
    return data?.block?.slug || 
           data?.block?.id || 
           node.id;
  };

  // Filter out bridge nodes from layout calculation
  const layoutNodes = nodes.filter(node => node.type !== 'laneBridge');

  // Group nodes by year
  const nodesByYear = new Map<number, Node[]>();
  
  layoutNodes.forEach(node => {
    const year = getLevelYear(node);
    if (!nodesByYear.has(year)) {
      nodesByYear.set(year, []);
    }
    nodesByYear.get(year)!.push(node);
  });

  console.log('[Layout][Grid] Nodes grouped by year:', {
    yearGroups: Array.from(nodesByYear.entries()).map(([year, nodes]) => ({
      year,
      count: nodes.length,
      tracks: [...new Set(nodes.map(getTrackId))]
    }))
  });

  // Position nodes using year-based grid
  const positionedNodes: Node[] = [];

  for (const [year, yearNodes] of nodesByYear) {
    const baseX = year * opts.colWidth;
    const baseYearY = opts.baseY + (year - 1) * opts.yearSpacing;

    // Separate nodes by track within each year
    const sharedNodes = yearNodes.filter(n => !getTrackId(n));
    const seNodes = yearNodes.filter(n => getTrackId(n) === 'software-engineering');
    const dsNodes = yearNodes.filter(n => getTrackId(n) === 'data-science');
    
    console.log('[Layout][Grid] Year', year, 'distribution:', {
      shared: sharedNodes.length,
      se: seNodes.length,  
      ds: dsNodes.length
    });

    let yOffset = 0;
    const nodeSpacing = 50;

    // Position shared nodes first (centered)
    sharedNodes.forEach((node, index) => {
      const x = baseX;
      const y = baseYearY + yOffset;
      
      positionedNodes.push({
        ...node,
        position: { x, y },
        draggable: false,
        dragging: false,
        data: {
          ...node.data,
          hasGridLayout: true
        }
      });
      
      yOffset += nodeSpacing;
    });

    // Add spacing between shared and track-specific nodes
    if (sharedNodes.length > 0 && (seNodes.length > 0 || dsNodes.length > 0)) {
      yOffset += opts.trackLaneSpacing;
    }

    // Position SE nodes (left lane in compare mode)
    if (seNodes.length > 0) {
      const seX = isCompare ? baseX - 200 : baseX;
      seNodes.forEach((node, index) => {
        const x = seX;
        const y = baseYearY + yOffset + (index * nodeSpacing);
        
        positionedNodes.push({
          ...node,
          position: { x, y },
          draggable: false,
          dragging: false,
          data: {
            ...node.data,
            hasGridLayout: true
          }
        });
      });
      
      if (dsNodes.length > 0) {
        yOffset += (seNodes.length * nodeSpacing) + 100;
      }
    }

    // Position DS nodes (right lane in compare mode) 
    if (dsNodes.length > 0) {
      const dsX = isCompare ? baseX + 200 : baseX;
      const dsY = seNodes.length > 0 ? yOffset : yOffset;
      
      dsNodes.forEach((node, index) => {
        const x = dsX;
        const y = baseYearY + dsY + (index * nodeSpacing);
        
        positionedNodes.push({
          ...node,
          position: { x, y },
          draggable: false,
          dragging: false,
          data: {
            ...node.data,
            hasGridLayout: true
          }
        });
      });
    }
  }

  // Add any bridge nodes back without layout (keep original positions)
  const bridgeNodes = nodes.filter(node => node.type === 'laneBridge');
  bridgeNodes.forEach(node => {
    positionedNodes.push({
      ...node,
      data: {
        ...node.data,
        hasGridLayout: false // Bridge nodes are not laid out
      }
    });
  });

  console.log('[Layout][Grid] Layout complete:', {
    totalNodes: positionedNodes.length,
    layoutedNodes: positionedNodes.filter(n => n.data?.hasGridLayout).length,
    bridgeNodes: positionedNodes.filter(n => !n.data?.hasGridLayout).length,
    samplePositions: positionedNodes.slice(0, 3).map(n => ({
      id: n.id,
      x: n.position.x,
      y: n.position.y,
      hasGrid: n.data?.hasGridLayout
    }))
  });

  return positionedNodes;
}
