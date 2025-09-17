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
  qaSplitMultiLane?: boolean;
}

const DEFAULT_GRID_CONFIG: GridLayoutConfig = {
  colWidth: 540,
  baseY: 100,
  yearSpacing: 400,
  trackLaneSpacing: 300
};

// Extended config for hardening
interface ExtendedGridConfig extends GridLayoutConfig {
  laneOffsetCompare: number;
  laneOffsetSingle: number;
  nodeSpacing: number;
}

const DEFAULT_EXTENDED_CONFIG: ExtendedGridConfig = {
  ...DEFAULT_GRID_CONFIG,
  laneOffsetCompare: 200,
  laneOffsetSingle: 0,
  nodeSpacing: 50
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

  const extendedOpts: ExtendedGridConfig = { ...DEFAULT_EXTENDED_CONFIG, ...config };
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

  // Helper function for consistent position setting
  const createPositionedNode = (node: Node, x: number, y: number): Node => ({
    ...node,
    position: { x, y },
    draggable: false,
    dragging: false,
    data: {
      ...node.data,
      hasGridLayout: true
    }
  });

  // Stable sorting function for deterministic lane ordering
  const getNodeSortKey = (node: Node): string => {
    const data = node.data as any;
    return (data?.block?.slug ?? data?.block?.title ?? node.id).toString();
  };

  // Position nodes using year-based grid
  const positionedNodes: Node[] = [];

  // Fix 1: Sort years to ensure deterministic iteration order
  for (const year of [...nodesByYear.keys()].sort((a, b) => a - b)) {
    const yearNodes = nodesByYear.get(year)!;
    const baseX = year * opts.colWidth;
    const baseYearY = opts.baseY + (year - 1) * opts.yearSpacing;

    // Separate nodes by track within each year
    const sharedNodes = yearNodes.filter(n => !getTrackId(n));
    const seNodes = yearNodes.filter(n => getTrackId(n) === 'software-engineering');
    const dsNodes = yearNodes.filter(n => getTrackId(n) === 'data-science');
    
    // Fix 2: Deterministic ordering within lanes
    sharedNodes.sort((a, b) => getNodeSortKey(a).localeCompare(getNodeSortKey(b)));
    seNodes.sort((a, b) => getNodeSortKey(a).localeCompare(getNodeSortKey(b)));
    dsNodes.sort((a, b) => getNodeSortKey(a).localeCompare(getNodeSortKey(b)));
    
    console.log('[Layout][Grid] Year', year, 'distribution:', {
      shared: sharedNodes.length,
      se: seNodes.length,  
      ds: dsNodes.length
    });

    let yOffset = 0;
    const nodeSpacing = extendedOpts.nodeSpacing;
    const laneOffset = isCompare ? extendedOpts.laneOffsetCompare : extendedOpts.laneOffsetSingle;

    // Position shared nodes first (centered)
    sharedNodes.forEach((node, index) => {
      const x = baseX;
      const y = baseYearY + yOffset;
      
      positionedNodes.push(createPositionedNode(node, x, y));
      yOffset += nodeSpacing;
    });

    // Add spacing between shared and track-specific nodes
    if (sharedNodes.length > 0 && (seNodes.length > 0 || dsNodes.length > 0)) {
      yOffset += opts.trackLaneSpacing;
    }

    // Fix 4: Clean Y-offset math with configurable spacing
    let laneYOffset = yOffset;
    if (seNodes.length > 0 && dsNodes.length > 0) {
      laneYOffset += 100; // inter-lane gap
    }

    // Position SE nodes (left lane in compare mode)
    if (seNodes.length > 0) {
      const seX = baseX - laneOffset;
      seNodes.forEach((node, index) => {
        const x = seX;
        const y = baseYearY + yOffset + (index * nodeSpacing);
        positionedNodes.push(createPositionedNode(node, x, y));
      });
    }

    // Position DS nodes (right lane in compare mode) 
    if (dsNodes.length > 0) {
      const dsX = baseX + laneOffset;
      const dsStartY = baseYearY + (seNodes.length > 0 ? laneYOffset : yOffset);
      
      dsNodes.forEach((node, index) => {
        const x = dsX;
        const y = dsStartY + (index * nodeSpacing);
        positionedNodes.push(createPositionedNode(node, x, y));
      });
    }
  }

  // Fix 5: Add bridge nodes back with proper hiding when not in QA split mode
  const bridgeNodes = nodes.filter(node => node.type === 'laneBridge');
  bridgeNodes.forEach(node => {
    const shouldHide = !config.qaSplitMultiLane;
    positionedNodes.push({
      ...node,
      hidden: shouldHide,
      data: {
        ...node.data,
        hasGridLayout: false // Bridge nodes are not laid out
      }
    });
  });

  // Fix 7: ID/Edge hygiene validation
  const idCounts = new Map<string, number>();
  positionedNodes.forEach(n => idCounts.set(n.id, (idCounts.get(n.id) || 0) + 1));
  const dupes = [...idCounts].filter(([_, c]) => c > 1);
  if (dupes.length) {
    console.warn('[Layout][Grid][IDs] Duplicate node IDs:', dupes.slice(0, 5));
  }

  console.log('[Layout][Grid] Layout complete:', {
    totalNodes: positionedNodes.length,
    layoutedNodes: positionedNodes.filter(n => n.data?.hasGridLayout).length,
    bridgeNodes: positionedNodes.filter(n => !n.data?.hasGridLayout).length,
    hiddenNodes: positionedNodes.filter(n => n.hidden).length,
    duplicateIds: dupes.length,
    samplePositions: positionedNodes.slice(0, 3).map(n => ({
      id: n.id,
      x: n.position?.x,
      y: n.position?.y,
      hasGrid: n.data?.hasGridLayout
    }))
  });

  return positionedNodes;
}
