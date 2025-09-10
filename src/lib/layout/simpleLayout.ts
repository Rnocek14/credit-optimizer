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
  layoutNodes = resolveAllCollisions(layoutNodes, 10);
  
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
    node.position = { x, y: currentY };
    
    // Get accurate height measurement
    const dimensions = measurements.get(node.id) || { width: 320, height: 180 };
    currentY += dimensions.height;
    
    // Add generous spacing between nodes (minimum 64px, more for larger nodes)
    if (index < nodes.length - 1) {
      const baseSpacing = 64;
      const contentBasedSpacing = Math.max(baseSpacing, dimensions.height * 0.15);
      currentY += Math.min(contentBasedSpacing, 120); // Cap at 120px
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

/**
 * Enhanced collision resolution with smart positioning
 */
function resolveCollisions(nodes: Node[]): Node[] {
  const resolvedNodes = [...nodes];
  let maxPasses = 5; // Increased passes for better resolution
  let pass = 0;
  
  while (pass < maxPasses) {
    const overlaps = detectOverlaps(resolvedNodes);
    
    if (overlaps.length === 0) {
      console.log(`✅ No overlaps after ${pass} passes`);
      break;
    }
    
    console.log(`🔄 Pass ${pass + 1}: Resolving ${overlaps.length} overlaps`);
    
    // Sort overlaps by severity (overlap area) to resolve worst first
    overlaps.sort((a, b) => {
      const aRect1 = getNodeBounds(a.node1);
      const aRect2 = getNodeBounds(a.node2);
      const bRect1 = getNodeBounds(b.node1);
      const bRect2 = getNodeBounds(b.node2);
      
      const aOverlapArea = calculateOverlapArea(aRect1, aRect2);
      const bOverlapArea = calculateOverlapArea(bRect1, bRect2);
      
      return bOverlapArea - aOverlapArea; // Largest overlaps first
    });
    
    // Resolve each overlap intelligently
    overlaps.forEach(({ node1, node2 }) => {
      const rect1 = getNodeBounds(node1);
      const rect2 = getNodeBounds(node2);
      
      // Determine which node to move based on position and flexibility
      const moveNode2 = node2.position.y >= node1.position.y;
      const nodeToMove = moveNode2 ? node2 : node1;
      const staticRect = moveNode2 ? rect1 : rect2;
      
      // Calculate optimal spacing (48px minimum between nodes)
      const optimalSpacing = 48;
      const newY = staticRect.y + staticRect.height + optimalSpacing;
      
      // Apply the position change
      nodeToMove.position.y = newY;
      
      // Check if moving this node horizontally might be better for dense areas
      const sameColumnNodes = resolvedNodes.filter(n => 
        Math.abs(n.position.x - nodeToMove.position.x) < 50 && n.id !== nodeToMove.id
      );
      
      // If column is very dense (>4 nodes), try horizontal distribution
      if (sameColumnNodes.length > 4 && pass > 1) {
        const originalX = nodeToMove.position.x;
        nodeToMove.position.x = originalX + 340; // Move to sub-column
        
        // Reset Y position for the new column
        const newColumnNodes = resolvedNodes.filter(n => 
          Math.abs(n.position.x - nodeToMove.position.x) < 50 && n.id !== nodeToMove.id
        );
        
        if (newColumnNodes.length === 0) {
          nodeToMove.position.y = 40; // Start of new column
        } else {
          // Stack below existing nodes in new column
          const maxY = Math.max(...newColumnNodes.map(n => {
            const bounds = getNodeBounds(n);
            return bounds.y + bounds.height;
          }));
          nodeToMove.position.y = maxY + optimalSpacing;
        }
      }
    });
    
    pass++;
  }
  
  if (pass >= maxPasses) {
    console.warn(`⚠️ Max collision resolution passes reached. ${detectOverlaps(resolvedNodes).length} overlaps remaining.`);
  }
  
  return resolvedNodes;
}

/**
 * Calculate overlap area between two rectangles
 */
function calculateOverlapArea(rect1: any, rect2: any): number {
  const xOverlap = Math.max(0, Math.min(rect1.x + rect1.width, rect2.x + rect2.width) - Math.max(rect1.x, rect2.x));
  const yOverlap = Math.max(0, Math.min(rect1.y + rect1.height, rect2.y + rect2.height) - Math.max(rect1.y, rect2.y));
  return xOverlap * yOverlap;
}

/**
 * Detect overlapping nodes
 */
function detectOverlaps(nodes: Node[]): { node1: Node; node2: Node }[] {
  const overlaps: { node1: Node; node2: Node }[] = [];
  
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const node1 = nodes[i];
      const node2 = nodes[j];
      
      const rect1 = getNodeBounds(node1);
      const rect2 = getNodeBounds(node2);
      
      if (hasOverlap(rect1, rect2)) {
        overlaps.push({ node1, node2 });
      }
    }
  }
  
  return overlaps;
}

/**
 * Get node bounds for collision detection (delegates to unified system)
 */
function getNodeBounds(node: Node) {
  return getNodeBoundsUnified(node);
}

/**
 * Check if two rectangles overlap (with small buffer)
 */
function hasOverlap(rect1: any, rect2: any): boolean {
  const buffer = 8; // Small buffer to prevent touching nodes
  return !(rect1.x + rect1.width + buffer < rect2.x || 
           rect2.x + rect2.width + buffer < rect1.x || 
           rect1.y + rect1.height + buffer < rect2.y || 
           rect2.y + rect2.height + buffer < rect1.y);
}

// Removed - now using unified calculateNodeDimensions from heightCalculation.ts