import { Node } from '@xyflow/react';

/**
 * Simple collision resolution focused on vertical stacking
 */
export function resolveAllCollisions(nodes: Node[], maxPasses = 3): Node[] {
  let resolvedNodes = [...nodes];
  let pass = 0;
  
  while (pass < maxPasses) {
    const collisions = detectCollisions(resolvedNodes);
    
    if (collisions.length === 0) {
      console.log(`✅ All collisions resolved in ${pass} passes`);
      break;
    }
    
    console.log(`🔄 Pass ${pass + 1}: Resolving ${collisions.length} collisions`);
    resolvedNodes = resolveCollisionsSimple(resolvedNodes, collisions);
    pass++;
  }
  
  return resolvedNodes;
}

/**
 * Enhanced collision resolution with better spacing
 */
function resolveCollisionsSimple(nodes: Node[], collisions: any[]): Node[] {
  const resolvedNodes = [...nodes];
  
  // Sort collisions by overlap severity to resolve worst first
  collisions.sort((a, b) => b.overlap - a.overlap);
  
  collisions.forEach(({ node1, node2 }) => {
    const rect1 = getNodeRect(node1);
    const rect2 = getNodeRect(node2);
    
    // Move the lower positioned node down with proper spacing
    const spacing = 64; // Increased spacing
    if (node2.position.y >= node1.position.y) {
      node2.position.y = rect1.y + rect1.height + spacing;
    } else {
      node1.position.y = rect2.y + rect2.height + spacing;
    }
  });
  
  return resolvedNodes;
}

import { getNodeBounds } from './heightCalculation';

/**
 * Get node rectangle for collision detection (unified system)
 */
function getNodeRect(node: Node) {
  return getNodeBounds(node);
}

/**
 * Detect overlapping nodes
 */
function detectCollisions(nodes: Node[]): { node1: Node; node2: Node; overlap: number }[] {
  const collisions: { node1: Node; node2: Node; overlap: number }[] = [];
  
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const node1 = nodes[i];
      const node2 = nodes[j];
      
      const rect1 = getNodeRect(node1);
      const rect2 = getNodeRect(node2);
      
      if (hasOverlap(rect1, rect2)) {
        const overlap = calculateOverlapArea(rect1, rect2);
        collisions.push({ node1, node2, overlap });
      }
    }
  }
  
  return collisions;
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
 * Calculate overlap area between two rectangles
 */
function calculateOverlapArea(rect1: any, rect2: any): number {
  const xOverlap = Math.max(0, Math.min(rect1.x + rect1.width, rect2.x + rect2.width) - Math.max(rect1.x, rect2.x));
  const yOverlap = Math.max(0, Math.min(rect1.y + rect1.height, rect2.y + rect2.height) - Math.max(rect1.y, rect2.y));
  return xOverlap * yOverlap;
}

/**
 * Validate that layout has no overlaps
 */
export function validateLayout(nodes: Node[]): boolean {
  const collisions = detectCollisions(nodes);
  const isValid = collisions.length === 0;
  
  if (!isValid) {
    console.warn(`❌ Layout validation failed: ${collisions.length} overlaps detected`);
  } else {
    console.log('✅ Layout validation passed: No overlaps detected');
  }
  
  return isValid;
}