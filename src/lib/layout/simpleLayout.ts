import { Node, Edge } from '@xyflow/react';

/**
 * ULTRA-SIMPLE layout system that just works
 * Two stages: Initial layout → React Flow measurement → Re-layout if needed
 */

export interface LayoutResult {
  nodes: Node[];
  hasOverlaps: boolean;
  layoutTime: number;
}

/**
 * Layout state tracking to prevent concurrent operations
 */
let isLayoutInProgress = false;

/**
 * Main layout function with simple year-based positioning and collision resolution
 */
export async function layoutNodes(nodes: Node[], edges: Edge[]): Promise<LayoutResult> {
  const startTime = performance.now();
  
  // Prevent concurrent layout operations
  if (isLayoutInProgress) {
    console.log('⏭️ Layout already in progress, skipping...');
    return {
      nodes: [...nodes], // Return a copy of current nodes
      hasOverlaps: false,
      layoutTime: 0
    };
  }
  
  isLayoutInProgress = true;
  
  try {
    console.log(`🎯 Simple layout for ${nodes.length} nodes`);
    
    if (nodes.length === 0) {
      return {
        nodes: [],
        hasOverlaps: false,
        layoutTime: performance.now() - startTime
      };
    }

  // Apply simple year-based layout with generous spacing
  let layoutedNodes = applyYearBasedLayout([...nodes]);
  
  // Import and apply collision resolution
  const { resolveAllCollisions, validateLayout } = await import('./collisionResolver');
  
  // Resolve any overlaps
  console.log('🔧 Resolving collisions...');
  layoutedNodes = resolveAllCollisions(layoutedNodes);
  
    // Validate final layout
    const hasOverlaps = !validateLayout(layoutedNodes);
    
    const layoutTime = performance.now() - startTime;
    console.log(`✅ Simple layout complete (${layoutTime.toFixed(1)}ms) - Overlaps: ${hasOverlaps}`);
    
    return {
      nodes: layoutedNodes,
      hasOverlaps,
      layoutTime
    };
  } finally {
    // Always clear the lock
    isLayoutInProgress = false;
  }
}

/**
 * Apply year-based layout with generous spacing
 */
function applyYearBasedLayout(nodes: Node[]): Node[] {
  // Group nodes by year
  const nodesByYear = new Map<number, Node[]>();
  
  nodes.forEach(node => {
    const data = node.data as any;
    const year = data.level_year ?? 1;
    if (!nodesByYear.has(year)) {
      nodesByYear.set(year, []);
    }
    nodesByYear.get(year)!.push(node);
  });

  const sortedYears = Array.from(nodesByYear.keys()).sort((a, b) => a - b);
  let currentX = 40; // Start position
  
  sortedYears.forEach(year => {
    const yearNodes = nodesByYear.get(year)!;
    
    // Sort nodes within year
    yearNodes.sort((a, b) => {
      const aData = a.data as any;
      const bData = b.data as any;
      return (aData.sortOrder ?? 0) - (bData.sortOrder ?? 0);
    });

    // Position nodes in column with massive spacing
    positionNodesInColumn(yearNodes, currentX);
    currentX += 480; // Reduced column spacing for better balance
  });

  return nodes;
}

/**
 * Position nodes vertically with generous spacing
 */
function positionNodesInColumn(nodes: Node[], x: number): void {
  let currentY = 50; // Start position with reduced padding
  
  nodes.forEach((node) => {
    node.position = { x, y: currentY };
    
    // Adaptive spacing based on node type with improved balance
    const nodeHeight = (node as any).measured?.height || getEstimatedHeight(node);
    const nodeType = getNodeTypeFromData(node.data);
    const adaptiveSpacing = getAdaptiveVerticalSpacing(nodeType);
    
    currentY += nodeHeight + adaptiveSpacing;
  });
}

function getEstimatedHeight(node: Node): number {
  // Prioritize measured height if available
  if ((node as any).measured?.height) {
    return (node as any).measured.height;
  }
  
  const data = node.data as any;
  
  if (data.block && data.block.courses) {
    const courseCount = data.block.courses.length;
    
    // Optimized height calculation with 10% safety margin
    let height = 140; // Base card height
    height += courseCount * 56; // Each course row
    
    // Account for specializations
    if (data.subBlocks && data.subBlocks.length > 0) {
      height += 100; // Collapsible header
      if (data.subBlocksExpanded) {
        height += data.subBlocks.length * 64;
      }
    }
    
    // Apply 10% safety margin
    return Math.floor(height * 1.1);
  }
  
  // Terminal or simple nodes with 10% safety margin
  return Math.floor(180 * 1.1);
}

/**
 * Get node type for adaptive spacing
 */
function getNodeTypeFromData(data: any): 'terminal' | 'course' | 'blockgroup' {
  if (data.block?.title?.toLowerCase().includes('degree')) {
    return 'terminal';
  }
  
  if (data.block?.courses?.length > 0) {
    return 'blockgroup';
  }
  
  return 'course';
}

/**
 * Get adaptive vertical spacing based on node type
 */
function getAdaptiveVerticalSpacing(nodeType: 'terminal' | 'course' | 'blockgroup'): number {
  switch (nodeType) {
    case 'terminal':
      return 30; // Terminal nodes need less space
    case 'course':
      return 40; // Medium spacing for course nodes
    case 'blockgroup':
      return 50; // Block groups need more space
    default:
      return 40;
  }
}

/**
 * Calculate total height needed for a year column
 */
function calculateYearColumnHeight(
  nodes: Node[], 
  measurements: Map<string, { width: number; height: number }>
): number {
  let totalHeight = 40; // Initial padding
  
  nodes.forEach((node, index) => {
    const dimensions = measurements.get(node.id) || { width: 320, height: 180 };
    totalHeight += dimensions.height;
    
    if (index < nodes.length - 1) {
      totalHeight += 64; // Minimum spacing
    }
  });
  
  return totalHeight + 40; // Bottom padding
}

/**
 * Intelligently distribute nodes into columns based on content height
 */
function distributeNodesIntoColumns(
  nodes: Node[], 
  measurements: Map<string, { width: number; height: number }>,
  maxColumnHeight: number
): Node[][] {
  const columns: Node[][] = [];
  let currentColumn: Node[] = [];
  let currentColumnHeight = 40; // Initial padding
  
  nodes.forEach((node, index) => {
    const dimensions = measurements.get(node.id) || { width: 320, height: 180 };
    const nodeWithSpacing = dimensions.height + (index < nodes.length - 1 ? 64 : 0);
    
    if (currentColumnHeight + nodeWithSpacing > maxColumnHeight && currentColumn.length > 0) {
      // Start new column
      columns.push(currentColumn);
      currentColumn = [node];
      currentColumnHeight = 40 + dimensions.height;
    } else {
      // Add to current column
      currentColumn.push(node);
      currentColumnHeight += nodeWithSpacing;
    }
  });
  
  if (currentColumn.length > 0) {
    columns.push(currentColumn);
  }
  
  return columns.length > 0 ? columns : [nodes];
}

// Removed duplicate collision resolution functions - using enhanced version from collisionResolver.ts