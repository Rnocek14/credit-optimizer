/**
 * Branching Tree Layout Algorithm
 * Implements proper educational track branching visualization
 */

import { Node } from '@xyflow/react';

interface BranchingLayoutConfig {
  startY: number;
  yearSpacing: number;
  centerColumn: number;
  leftBranch: number;
  rightBranch: number;
  branchingYear: number; // Year when tracks split
}

/**
 * Branching layout configuration for educational track visualization
 */
const BRANCHING_LAYOUT_CONFIG: BranchingLayoutConfig = {
  startY: -200,           // Starting Y position (top of tree)
  yearSpacing: 700,       // Vertical spacing between year levels  
  centerColumn: 515,      // Center column for shared blocks
  leftBranch: -30,        // Left branch for software engineering
  rightBranch: 1025,      // Right branch for data science
  branchingYear: 3        // Year 3 is when tracks diverge
};

/**
 * Apply branching tree layout positioning to React Flow nodes
 * Creates proper educational track branching visualization
 */
export function applyBranchingTreeLayout(nodes: Node[]): Node[] {
  console.log('[BranchingLayout] Applying branching layout to', nodes.length, 'nodes');
  
  // Group nodes by level_year and track
  const nodesByYear = new Map<number, Node[]>();
  const sharedNodes: Node[] = [];
  const softwareNodes: Node[] = [];
  const dataNodes: Node[] = [];
  
  nodes.forEach(node => {
    const blockData = node.data as any;
    const year = (blockData?.level_year || blockData?.block?.level_year || 0) as number;
    const trackId = blockData?.block?.track_id || blockData?.phaseA?.trackId;
    
    // Group by year for overall structure
    if (!nodesByYear.has(year)) {
      nodesByYear.set(year, []);
    }
    nodesByYear.get(year)!.push(node);
    
    // Also group by track for branching logic
    if (!trackId) {
      sharedNodes.push(node);
    } else if (trackId === 'software-engineering') {
      softwareNodes.push(node);
    } else if (trackId === 'data-science') {
      dataNodes.push(node);
    }
  });
  
  const positionedNodes: Node[] = [];
  const sortedYears = Array.from(nodesByYear.keys()).sort((a, b) => a - b);
  
  console.log('[BranchingLayout] Track distribution:', {
    shared: sharedNodes.length,
    software: softwareNodes.length,
    dataScience: dataNodes.length,
    years: sortedYears
  });
  
  sortedYears.forEach((year, yearIndex) => {
    const yearNodes = nodesByYear.get(year)!;
    const yPosition = BRANCHING_LAYOUT_CONFIG.startY + (yearIndex * BRANCHING_LAYOUT_CONFIG.yearSpacing);
    
    console.log('[BranchingLayout] Year', year, '- positioning', yearNodes.length, 'nodes at Y:', yPosition);
    
    // Position nodes based on branching logic
    yearNodes.forEach((node, nodeIndex) => {
      const blockData = node.data as any;
      const trackId = blockData?.block?.track_id || blockData?.phaseA?.trackId;
      let xPosition: number;
      
      if (year < BRANCHING_LAYOUT_CONFIG.branchingYear) {
        // Pre-branching years (Y1-Y2): Center all shared blocks
        xPosition = BRANCHING_LAYOUT_CONFIG.centerColumn;
        
        // If multiple blocks in same year, slightly offset to avoid overlap
        if (yearNodes.length > 1) {
          const offset = (nodeIndex - (yearNodes.length - 1) / 2) * 100;
          xPosition += offset;
        }
      } else {
        // Branching years (Y3+): Position by track
        if (trackId === 'software-engineering') {
          xPosition = BRANCHING_LAYOUT_CONFIG.leftBranch;
        } else if (trackId === 'data-science') {
          xPosition = BRANCHING_LAYOUT_CONFIG.rightBranch;
        } else {
          // Shared blocks in later years stay centered
          xPosition = BRANCHING_LAYOUT_CONFIG.centerColumn;
        }
        
        // Handle multiple nodes of same track in same year
        const sameTrackNodes = yearNodes.filter(n => {
          const nData = n.data as any;
          const nTrackId = nData?.block?.track_id || nData?.phaseA?.trackId;
          return nTrackId === trackId;
        });
        
        if (sameTrackNodes.length > 1) {
          const trackIndex = sameTrackNodes.indexOf(node);
          const offset = trackIndex * 80; // Slight vertical stacking for same track
          xPosition += (trackId === 'software-engineering' ? offset : -offset);
        }
      }
      
      positionedNodes.push({
        ...node,
        position: { x: xPosition, y: yPosition },
        data: {
          ...node.data,
          hasBranchingLayout: true,
          branchPosition: year < BRANCHING_LAYOUT_CONFIG.branchingYear ? 'shared' : 
                         trackId === 'software-engineering' ? 'left-branch' :
                         trackId === 'data-science' ? 'right-branch' : 'center'
        },
        draggable: true
      });
    });
  });
  
  console.log('[BranchingLayout] Positioned nodes:', {
    totalNodes: positionedNodes.length,
    sharedCount: positionedNodes.filter(n => n.data.branchPosition === 'shared').length,
    leftBranchCount: positionedNodes.filter(n => n.data.branchPosition === 'left-branch').length,
    rightBranchCount: positionedNodes.filter(n => n.data.branchPosition === 'right-branch').length,
    centerCount: positionedNodes.filter(n => n.data.branchPosition === 'center').length
  });
  
  return positionedNodes;
}

/**
 * Legacy clean tree layout for backward compatibility
 */
export function applyCleanTreeLayout(nodes: Node[]): Node[] {
  // For now, use the new branching layout as the default
  return applyBranchingTreeLayout(nodes);
}

/**
 * Get tree layout statistics for debugging
 */
export function getTreeLayoutStats(nodes: Node[]): {
  yearCounts: Record<number, number>;
  totalNodes: number;
  yearRange: [number, number];
} {
  const yearCounts: Record<number, number> = {};
  
  nodes.forEach(node => {
    const blockData = node.data as any;
    const year = (blockData?.level_year || blockData?.block?.level_year || 0) as number;
    yearCounts[year] = (yearCounts[year] || 0) + 1;
  });
  
  const years = Object.keys(yearCounts).map(Number).filter(y => !isNaN(y));
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  
  return {
    yearCounts,
    totalNodes: nodes.length,
    yearRange: [minYear, maxYear]
  };
}