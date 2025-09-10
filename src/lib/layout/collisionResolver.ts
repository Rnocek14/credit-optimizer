import { Node } from '@xyflow/react';
import { detectCollisions } from './heightMeasurement';

/**
 * Lane-aware multi-pass collision resolution system
 * Resolves collisions while respecting lane assignments
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
    resolvedNodes = resolveSinglePassWithLanes(resolvedNodes, collisions);
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
 * Lane-aware collision resolution in a single pass
 */
function resolveSinglePassWithLanes(nodes: Node[], collisions: any[]): Node[] {
  const resolvedNodes = [...nodes];
  const nodeMap = new Map(resolvedNodes.map(node => [node.id, node]));
  
  // Group nodes by lane (X position) for lane-aware resolution
  const nodesByLane = new Map<number, Node[]>();
  resolvedNodes.forEach(node => {
    const laneX = Math.round(node.position.x / 400) * 400; // Group by ~400px lanes
    if (!nodesByLane.has(laneX)) {
      nodesByLane.set(laneX, []);
    }
    nodesByLane.get(laneX)!.push(node);
  });
  
  // Sort collisions by overlap (resolve biggest overlaps first)
  const sortedCollisions = collisions.sort((a, b) => b.overlap - a.overlap);
  
  sortedCollisions.forEach(({ node1, node2 }) => {
    const currentNode1 = nodeMap.get(node1.id)!;
    const currentNode2 = nodeMap.get(node2.id)!;
    
    const separation = calculateSeparationDistance(currentNode1, currentNode2);
    
    // Check if nodes are in the same lane
    const lane1X = Math.round(currentNode1.position.x / 400) * 400;
    const lane2X = Math.round(currentNode2.position.x / 400) * 400;
    
    if (Math.abs(lane1X - lane2X) < 200) {
      // Same lane: stack vertically with better spacing
      if (currentNode2.position.y >= currentNode1.position.y) {
        currentNode2.position.y = currentNode1.position.y + separation.y + 24;
      } else {
        currentNode1.position.y = currentNode2.position.y + separation.y + 24;
      }
    } else {
      // Different lanes: adjust horizontally if needed, then vertically
      const horizontalGap = Math.abs(currentNode1.position.x - currentNode2.position.x);
      if (horizontalGap < 340) {
        // Too close horizontally, move one node
        if (currentNode1.position.x < currentNode2.position.x) {
          currentNode2.position.x = currentNode1.position.x + 340;
        } else {
          currentNode1.position.x = currentNode2.position.x + 340;
        }
      }
      // Still stack vertically if needed
      if (Math.abs(currentNode1.position.y - currentNode2.position.y) < separation.y) {
        if (currentNode2.position.y >= currentNode1.position.y) {
          currentNode2.position.y = currentNode1.position.y + separation.y + 16;
        } else {
          currentNode1.position.y = currentNode2.position.y + separation.y + 16;
        }
      }
    }
  });
  
  return resolvedNodes;
}

/**
 * Calculate the minimum distance needed to separate two nodes
 */
function calculateSeparationDistance(node1: Node, node2: Node) {
  const height1 = getNodeHeight(node1);
  const height2 = getNodeHeight(node2);
  
  const padding = 32; // Increased padding for better spacing
  
  return {
    x: Math.max(320, node1.measured?.width ?? 320) + padding,
    y: Math.max(height1, height2) + padding
  };
}

/**
 * Get accurate node height from multiple sources
 */
function getNodeHeight(node: Node): number {
  // Priority: measured height > data height > estimated height
  if (node.measured?.height) return node.measured.height;
  const data = node.data as any;
  if (data?.measuredHeight) return data.measuredHeight;
  return estimateNodeHeight(node);
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