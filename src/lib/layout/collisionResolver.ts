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
 * Simple collision resolution - just move overlapping nodes down
 */
function resolveCollisionsSimple(nodes: Node[], collisions: any[]): Node[] {
  const resolvedNodes = [...nodes];
  
  // Sort collisions by Y position to resolve from top to bottom
  collisions.sort((a, b) => a.node1.position.y - b.node1.position.y);
  
  collisions.forEach(({ node1, node2 }) => {
    const rect1 = getNodeRect(node1);
    const rect2 = getNodeRect(node2);
    
    // Move the lower positioned node down to clear the collision
    if (node2.position.y >= node1.position.y) {
      node2.position.y = rect1.y + rect1.height + 32; // 32px spacing
    } else {
      node1.position.y = rect2.y + rect2.height + 32;
    }
  });
  
  return resolvedNodes;
}

/**
 * Get node rectangle for collision detection
 */
function getNodeRect(node: Node) {
  const width = node.type === 'blockGroup' ? 320 : 200;
  const height = estimateNodeHeight(node);
  
  return {
    x: node.position.x,
    y: node.position.y,
    width,
    height
  };
}

/**
 * Smart height estimation for collision calculations
 */
function estimateNodeHeight(node: Node): number {
  if (node.type === 'blockGroup') {
    const data = node.data as any;
    const baseHeight = 120;
    const courseCount = data.block?.courses?.length || 3;
    const subBlockCount = data.subBlocks?.length || 0;
    
    return baseHeight + (courseCount * 60) + (subBlockCount * 80);
  }
  return 100;
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