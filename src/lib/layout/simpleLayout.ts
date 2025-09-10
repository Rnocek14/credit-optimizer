import { Node, Edge } from '@xyflow/react';
import { resolveAllCollisions, validateLayout } from './collisionResolver';
import { measurementSystem, measureNodes } from './measurementSystem';
import { 
  calculateNodeDimensions, 
  getNodeBounds as getNodeBoundsUnified,
  calculateOptimalSpacing,
  estimateColumnHeight,
  shouldDistributeHorizontally 
} from './heightCalculation';

/**
 * Simplified layout system focused on eliminating overlaps
 * Two-stage process: Year-based positioning → Collision resolution
 */

export interface LayoutResult {
  nodes: Node[];
  hasOverlaps: boolean;
  layoutTime: number;
}

/**
 * Main layout function with two-stage measurement and collision resolution
 */
export async function layoutNodes(nodes: Node[], edges: Edge[]): Promise<LayoutResult> {
  const startTime = performance.now();
  
  console.log(`🎯 Starting two-stage layout for ${nodes.length} nodes`);
  
  if (nodes.length === 0) {
    return {
      nodes: [],
      hasOverlaps: false,
      layoutTime: performance.now() - startTime
    };
  }

  // Stage 1: Get accurate measurements for all nodes
  console.log('📏 Stage 1: Measuring node dimensions...');
  const measurements = await measureNodes(nodes);
  
  // Stage 2: Apply year-based layout with accurate measurements
  console.log('📐 Stage 2: Applying year-based layout...');
  let layoutNodes = applyYearBasedLayoutWithMeasurements([...nodes], measurements);
  
  // Stage 3: Enhanced collision resolution with multiple passes
  console.log('🔧 Stage 3: Resolving collisions...');
  layoutNodes = resolveAllCollisions(layoutNodes, 15); // Increased passes for thorough resolution
  
  // Final validation
  const hasOverlaps = !validateLayout(layoutNodes);
  const layoutTime = performance.now() - startTime;
  
  console.log(hasOverlaps ? 
    `❌ Layout complete with overlaps (${layoutTime.toFixed(1)}ms)` : 
    `✅ Layout complete: NO OVERLAPS (${layoutTime.toFixed(1)}ms)`
  );
  
  return {
    nodes: layoutNodes,
    hasOverlaps,
    layoutTime
  };
}

/**
 * Apply year-based layout with accurate measurements and proper spacing
 */
function applyYearBasedLayoutWithMeasurements(
  nodes: Node[], 
  measurements: Map<string, { width: number; height: number }>
): Node[] {
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

    // Calculate total height needed for this year
    const totalHeight = calculateYearColumnHeight(yearNodes, measurements);
    const maxColumnHeight = 1000; // Increased from 800
    
    if (totalHeight > maxColumnHeight && yearNodes.length > 2) {
      // Split into multiple columns with smart distribution
      const columns = distributeNodesIntoColumns(yearNodes, measurements, maxColumnHeight);
      
      columns.forEach((columnNodes, columnIndex) => {
        const columnX = currentX + (columnIndex * 360);
        positionNodesInColumnWithMeasurements(columnNodes, columnX, 40, measurements);
      });
      
      currentX += columns.length * 360;
    } else {
      // Single column
      positionNodesInColumnWithMeasurements(yearNodes, currentX, 40, measurements);
      currentX += 360;
    }
  });

  return nodes;
}

/**
 * Position nodes vertically with accurate measurements and generous spacing
 */
function positionNodesInColumnWithMeasurements(
  nodes: Node[], 
  x: number, 
  startY: number, 
  measurements: Map<string, { width: number; height: number }>
): void {
  let currentY = startY;
  
  nodes.forEach((node, index) => {
    // Set position BEFORE calculating next Y
    node.position = { x, y: currentY };
    
    // Get accurate height measurement
    const dimensions = measurements.get(node.id) || { width: 320, height: 200 };
    
    // Add generous spacing between nodes (minimum 80px, more for larger nodes)
    if (index < nodes.length - 1) {
      const baseSpacing = 80; // Increased base spacing
      const contentBasedSpacing = Math.max(baseSpacing, dimensions.height * 0.2);
      const finalSpacing = Math.min(contentBasedSpacing, 140); // Increased cap
      currentY += dimensions.height + finalSpacing;
    } else {
      // Last node - no spacing needed
      currentY += dimensions.height;
    }
  });
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