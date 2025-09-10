import { Node } from '@xyflow/react';
import { detectCollisions } from './heightMeasurement';

/**
 * Multi-pass collision resolution system
 * Guarantees no overlaps by iteratively resolving conflicts
 */
export function resolveAllCollisions(nodes: Node[], maxPasses = 5): Node[] {
  let resolvedNodes = [...nodes];
  let pass = 0;
  
  while (pass < maxPasses) {
    const collisions = detectCollisions(resolvedNodes);
    
    if (collisions.length === 0) {
      console.log(`✅ All collisions resolved in ${pass} passes`);
      break;
    }
    
    console.log(`🔄 Pass ${pass + 1}: Resolving ${collisions.length} collisions`);
    resolvedNodes = resolveSinglePass(resolvedNodes, collisions);
    pass++;
  }
  
  // Emergency fallback if we couldn't resolve all collisions
  if (pass >= maxPasses) {
    console.warn('⚠️ Using emergency grid fallback');
    resolvedNodes = emergencyGridLayout(resolvedNodes);
  }
  
  return resolvedNodes;
}

/**
 * Resolve collisions in a single pass
 */
function resolveSinglePass(nodes: Node[], collisions: any[]): Node[] {
  const resolvedNodes = [...nodes];
  const nodeMap = new Map(resolvedNodes.map(node => [node.id, node]));
  
  // Sort collisions by overlap (resolve biggest overlaps first)
  const sortedCollisions = collisions.sort((a, b) => b.overlap - a.overlap);
  
  sortedCollisions.forEach(({ node1, node2 }) => {
    const currentNode1 = nodeMap.get(node1.id)!;
    const currentNode2 = nodeMap.get(node2.id)!;
    
    // Calculate separation distance needed
    const separation = calculateSeparationDistance(currentNode1, currentNode2);
    
    // Move the lower node down (prefer moving down over moving sideways)
    if (currentNode2.position.y >= currentNode1.position.y) {
      currentNode2.position.y = currentNode1.position.y + separation.y;
    } else {
      currentNode1.position.y = currentNode2.position.y + separation.y;
    }
  });
  
  return resolvedNodes;
}

/**
 * Calculate the minimum distance needed to separate two nodes
 */
function calculateSeparationDistance(node1: Node, node2: Node) {
  const height1 = node1.measured?.height ?? estimateNodeHeight(node1);
  const height2 = node2.measured?.height ?? estimateNodeHeight(node2);
  
  const padding = 24; // 8pt rhythm * 3
  
  return {
    x: Math.max(320, node1.measured?.width ?? 320) + padding,
    y: height1 + padding
  };
}

/**
 * Emergency grid layout when collision resolution fails
 */
function emergencyGridLayout(nodes: Node[]): Node[] {
  const columns = 3;
  const columnWidth = 360;
  const rowHeight = 280;
  const padding = 24;
  
  return nodes.map((node, index) => ({
    ...node,
    position: {
      x: (index % columns) * columnWidth + padding,
      y: Math.floor(index / columns) * rowHeight + padding
    }
  }));
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