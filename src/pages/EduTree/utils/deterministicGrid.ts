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

// Consolidated default config for cleaner callsites
export const DEFAULT_GRID_CONFIG = {
  colWidth: 440,
  baseY: 0,
  yearSpacing: 320,
  trackLaneSpacing: 80,
  laneOffsetCompare: 320,
  laneOffsetSingle: 140,
  nodeSpacing: 64,
  qaSplitMultiLane: false
} as const;

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

  const extendedOpts = { ...DEFAULT_GRID_CONFIG, ...config };

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
    const baseX = year * extendedOpts.colWidth;
    const baseYearY = extendedOpts.baseY + (year - 1) * extendedOpts.yearSpacing;

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

    // Smart placement helpers to prevent stacking in single-track mode
    const placeShared = (node: Node, y: number) => {
      const x = baseX - (isSingleTrack ? Math.round(laneOffset * 0.8) : 0);
      positionedNodes.push(createPositionedNode(node, x, y));
    };

    const placeSE = (node: Node, y: number) => {
      const x = isCompare ? (baseX - laneOffset)
                          : (isSingleTrack && activeTrack === 'software-engineering' ? baseX : baseX + laneOffset);
      positionedNodes.push(createPositionedNode(node, x, y));
    };

    const placeDS = (node: Node, y: number) => {
      const x = isCompare ? (baseX + laneOffset)
                          : (isSingleTrack && activeTrack === 'data-science' ? baseX : baseX + laneOffset);
      positionedNodes.push(createPositionedNode(node, x, y));
    };

    // Position shared nodes first
    sharedNodes.forEach((node, index) => {
      const y = baseYearY + yOffset + (index * nodeSpacing);
      placeShared(node, y);
    });
    if (sharedNodes.length > 0) {
      yOffset += sharedNodes.length * nodeSpacing;
    }

    // Add spacing between shared and track-specific nodes
    if (sharedNodes.length > 0 && (seNodes.length > 0 || dsNodes.length > 0)) {
      yOffset += extendedOpts.trackLaneSpacing;
    }

    // Position SE nodes
    if (seNodes.length > 0) {
      seNodes.forEach((node, index) => {
        const y = baseYearY + yOffset + (index * nodeSpacing);
        placeSE(node, y);
      });
      yOffset += seNodes.length * nodeSpacing;
    }

    // Add inter-lane gap if both SE and DS nodes exist
    if (seNodes.length > 0 && dsNodes.length > 0) {
      yOffset += 100; // inter-lane gap
    }

    // Position DS nodes
    if (dsNodes.length > 0) {
      const dsStartY = baseYearY + (seNodes.length > 0 ? yOffset : yOffset);
      dsNodes.forEach((node, index) => {
        const y = dsStartY + (index * nodeSpacing);
        placeDS(node, y);
      });
    }
  }

  // Fix 5: Add bridge nodes back with proper hiding when not in QA split mode
  const bridgeNodes = nodes.filter(node => node.type === 'laneBridge');
  bridgeNodes.forEach(node => {
    const shouldHide = !extendedOpts.qaSplitMultiLane;
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
