/**
 * Clean Tree Layout Algorithm
 * Based on user's proven manual positioning patterns
 */

import { Node } from '@xyflow/react';

interface TreeLayoutConfig {
  startY: number;
  yearSpacing: number;
  columnPositions: number[];
}

/**
 * Clean tree layout configuration extracted from user's manual positioning
 */
const TREE_LAYOUT_CONFIG: TreeLayoutConfig = {
  startY: -200,           // Starting Y position (top of tree)
  yearSpacing: 700,       // Vertical spacing between year levels
  columnPositions: [-30, 515, 1025]  // Three column positions for horizontal distribution
};

/**
 * Apply clean tree layout positioning to React Flow nodes
 */
export function applyCleanTreeLayout(nodes: Node[]): Node[] {
  console.log('[CleanTreeLayout] Applying tree layout to', nodes.length, 'nodes');
  
  // Group nodes by level_year
  const nodesByYear = new Map<number, Node[]>();
  nodes.forEach(node => {
    const blockData = node.data as any;
    const year = (blockData?.level_year || blockData?.block?.level_year || 0) as number;
    if (!nodesByYear.has(year)) {
      nodesByYear.set(year, []);
    }
    nodesByYear.get(year)!.push(node);
  });
  
  const positionedNodes: Node[] = [];
  const sortedYears = Array.from(nodesByYear.keys()).sort((a, b) => a - b);
  
  sortedYears.forEach((year, yearIndex) => {
    const yearNodes = nodesByYear.get(year)!;
    const yPosition = TREE_LAYOUT_CONFIG.startY + (yearIndex * TREE_LAYOUT_CONFIG.yearSpacing);
    
    console.log('[CleanTreeLayout] Year', year, '- positioning', yearNodes.length, 'nodes at Y:', yPosition);
    
    // Distribute nodes across available column positions
    yearNodes.forEach((node, nodeIndex) => {
      let xPosition: number;
      
      if (yearNodes.length === 1) {
        // Single node - use leftmost column (foundation pattern)
        xPosition = TREE_LAYOUT_CONFIG.columnPositions[0];
      } else if (yearNodes.length === 2) {
        // Two nodes - use left and center-right columns
        xPosition = nodeIndex === 0 ? 
          TREE_LAYOUT_CONFIG.columnPositions[0] : 
          TREE_LAYOUT_CONFIG.columnPositions[1];
      } else if (yearNodes.length === 3) {
        // Three nodes - use all three columns
        xPosition = TREE_LAYOUT_CONFIG.columnPositions[nodeIndex];
      } else {
        // More than 3 nodes - distribute evenly across columns
        const columnIndex = nodeIndex % TREE_LAYOUT_CONFIG.columnPositions.length;
        xPosition = TREE_LAYOUT_CONFIG.columnPositions[columnIndex];
      }
      
      positionedNodes.push({
        ...node,
        position: { x: xPosition, y: yPosition },
        data: {
          ...node.data,
          hasCleanTreeLayout: true
        },
        draggable: true  // Enable dragging for manual positioning
      });
    });
  });
  
  console.log('[CleanTreeLayout] Positioned nodes:', {
    totalNodes: positionedNodes.length,
    yearBreakdown: sortedYears.map(year => ({
      year,
      count: nodesByYear.get(year)?.length || 0,
      sampleY: TREE_LAYOUT_CONFIG.startY + (sortedYears.indexOf(year) * TREE_LAYOUT_CONFIG.yearSpacing)
    }))
  });
  
  return positionedNodes;
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