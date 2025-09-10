import { Node, Edge } from '@xyflow/react';
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
 * Main layout function - simplified pipeline
 */
export async function layoutNodes(nodes: Node[], edges: Edge[]): Promise<LayoutResult> {
  const startTime = performance.now();
  
  console.log(`🎯 Starting layout for ${nodes.length} nodes`);
  
  // Stage 1: Year-based column positioning
  let layoutedNodes = applyYearBasedLayout(nodes);
  
  // Stage 2: Resolve any collisions
  layoutedNodes = resolveCollisions(layoutedNodes);
  
  // Stage 3: Validation
  const hasOverlaps = detectOverlaps(layoutedNodes).length > 0;
  const layoutTime = performance.now() - startTime;
  
  console.log(`✅ Layout complete: ${hasOverlaps ? 'HAS OVERLAPS' : 'NO OVERLAPS'} (${layoutTime.toFixed(1)}ms)`);
  
  return {
    nodes: layoutedNodes,
    hasOverlaps,
    layoutTime
  };
}

/**
 * Apply year-based column layout with smart vertical positioning
 */
function applyYearBasedLayout(nodes: Node[]): Node[] {
  const yearColumns = [80, 440, 800, 1160]; // Year 1-4 columns (320px width + 120px spacing)
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
  
  // Sort nodes within each year by area/priority
  nodesByYear.forEach(yearNodes => {
    yearNodes.sort((a, b) => {
      const aData = a.data as any;
      const bData = b.data as any;
      return (aData.sortOrder ?? 0) - (bData.sortOrder ?? 0);
    });
  });
  
  // Calculate positions with smart vertical spacing
  return nodes.map(node => {
    const data = node.data as any;
    const year = data.level_year ?? 1;
    const yearNodes = nodesByYear.get(year) || [];
    const nodeIndex = yearNodes.findIndex(n => n.id === node.id);
    
    // Calculate cumulative height for proper vertical positioning
    let yPosition = 40; // Starting Y position
    
    for (let i = 0; i < nodeIndex; i++) {
      const prevNode = yearNodes[i];
      const prevDimensions = calculateNodeDimensions(prevNode);
      yPosition += prevDimensions.height;
      
      // Add optimal spacing between this node and the next
      const nextNode = yearNodes[i + 1]; // This could be the current node or the one after
      if (nextNode) {
        yPosition += calculateOptimalSpacing(prevNode, nextNode);
      } else {
        yPosition += 64; // Default spacing when no next node
      }
    }
    
    // Handle horizontal distribution when column is too tall
    const maxColumnHeight = (typeof window !== 'undefined' && window.innerHeight) ? 
      window.innerHeight - 200 : 800;
    
    let xPosition = yearColumns[year - 1] ?? 80;
    
    // Check if we need horizontal distribution
    if (shouldDistributeHorizontally(yearNodes, maxColumnHeight)) {
      const subColumn = Math.floor(nodeIndex / 4);
      xPosition += subColumn * 360; // Offset horizontally (320px width + 40px spacing)
      
      // Recalculate Y position for sub-column
      const subColumnIndex = nodeIndex % 4;
      const subColumnNodes = yearNodes.slice(subColumn * 4, (subColumn + 1) * 4);
      
      yPosition = 40; // Reset to top of sub-column
      for (let i = 0; i < subColumnIndex; i++) {
        if (i < subColumnNodes.length) {
          const prevNode = subColumnNodes[i];
          const prevDimensions = calculateNodeDimensions(prevNode);
          yPosition += prevDimensions.height;
          
          // Add spacing between nodes
          const nextNode = subColumnNodes[i + 1];
          if (nextNode) {
            yPosition += calculateOptimalSpacing(prevNode, nextNode);
          } else {
            yPosition += 64; // Default spacing
          }
        }
      }
    }
    
    return {
      ...node,
      position: {
        x: xPosition,
        y: yPosition
      }
    };
  });
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