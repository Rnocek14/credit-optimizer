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
 * Enhanced collision resolution with intelligent spacing and horizontal distribution
 */
function resolveCollisionsSimple(nodes: Node[], collisions: any[]): Node[] {
  const resolvedNodes = [...nodes];
  
  // Sort collisions by overlap severity to resolve worst first
  collisions.sort((a, b) => b.overlap - a.overlap);
  
  collisions.forEach(({ node1, node2 }) => {
    const rect1 = getNodeRect(node1);
    const rect2 = getNodeRect(node2);
    
    // Calculate intelligent spacing based on node heights
    const baseSpacing = 80; // Increased base spacing
    const contentSpacing = Math.max(rect1.height, rect2.height) * 0.2;
    const finalSpacing = Math.min(baseSpacing + contentSpacing, 150);
    
    // Determine which node to move (prefer moving the lower one)
    if (node2.position.y >= node1.position.y) {
      const newY = rect1.y + rect1.height + finalSpacing;
      node2.position.y = newY;
      
      // Check if we should consider horizontal distribution
      if (newY > 1200) { // If getting too low, try horizontal shift
        const horizontalShift = findHorizontalSpace(nodes, node2, rect2.width);
        if (horizontalShift !== null) {
          node2.position.x = horizontalShift;
          node2.position.y = Math.max(40, node2.position.y - 200); // Move back up
        }
      }
    } else {
      const newY = rect2.y + rect2.height + finalSpacing;
      node1.position.y = newY;
      
      if (newY > 1200) {
        const horizontalShift = findHorizontalSpace(nodes, node1, rect1.width);
        if (horizontalShift !== null) {
          node1.position.x = horizontalShift;
          node1.position.y = Math.max(40, node1.position.y - 200);
        }
      }
    }
  });
  
  return resolvedNodes;
}

/**
 * Find available horizontal space for a node to avoid vertical crowding
 */
function findHorizontalSpace(nodes: Node[], targetNode: Node, nodeWidth: number): number | null {
  const targetRect = getNodeRect(targetNode);
  const possibleXPositions = [];
  
  // Check positions to the left and right of existing nodes
  for (const node of nodes) {
    if (node.id === targetNode.id) continue;
    const rect = getNodeRect(node);
    
    // Try position to the right
    possibleXPositions.push(rect.x + rect.width + 40);
    // Try position to the left
    possibleXPositions.push(rect.x - nodeWidth - 40);
  }
  
  // Test each position for conflicts
  for (const x of possibleXPositions) {
    if (x < 0) continue; // Don't go off screen
    
    const testRect = { x, y: targetRect.y, width: nodeWidth, height: targetRect.height };
    let hasConflict = false;
    
    for (const node of nodes) {
      if (node.id === targetNode.id) continue;
      const rect = getNodeRect(node);
      if (hasOverlap(testRect, rect)) {
        hasConflict = true;
        break;
      }
    }
    
    if (!hasConflict) {
      return x;
    }
  }
  
  return null;
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