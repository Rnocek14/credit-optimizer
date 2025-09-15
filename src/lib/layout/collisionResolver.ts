import { Node } from '@xyflow/react';

/**
 * Enhanced collision resolution with intelligent spacing and multiple strategies
 */
export function resolveAllCollisions(nodes: Node[], maxPasses = 15): Node[] {
  let resolvedNodes = [...nodes];
  let pass = 0;
  let lastCollisionCount = Infinity;
  
  while (pass < maxPasses) {
    const collisions = detectCollisions(resolvedNodes);
    
    if (collisions.length === 0) {
      console.log(`✅ All collisions resolved in ${pass} passes`);
      break;
    }
    
    // Early termination if not improving
    if (collisions.length >= lastCollisionCount && pass > 5) {
      console.log(`🛑 Collision resolution plateaued at ${collisions.length} overlaps after ${pass} passes`);
      break;
    }
    
    console.log(`🔄 Pass ${pass + 1}: Resolving ${collisions.length} collisions`);
    resolvedNodes = resolveCollisionsSimple(resolvedNodes, collisions);
    lastCollisionCount = collisions.length;
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
    
    // Adaptive spacing based on node type and content
    const nodeType = getNodeType(node1, node2);
    const baseSpacing = getAdaptiveSpacing(nodeType);
    const largerNodeHeight = Math.max(rect1.height, rect2.height);
    const contentSpacing = largerNodeHeight * 0.15; // Reduced multiplier for better balance
    const finalSpacing = Math.max(baseSpacing + contentSpacing, baseSpacing);
    
    // Determine which node to move (prefer moving the lower one)
    if (node2.position.y >= node1.position.y) {
      const newY = rect1.y + rect1.height + finalSpacing;
      node2.position.y = newY;
      
      // Check if we should consider horizontal distribution for tall layouts
      if (newY > 1200) { // Higher threshold - allow more vertical stacking
        const horizontalShift = findHorizontalSpace(nodes, node2, rect2.width);
        if (horizontalShift !== null) {
          node2.position.x = horizontalShift;
          node2.position.y = Math.max(40, rect1.y); // Position at same level as conflicting node
        }
      }
    } else {
      const newY = rect2.y + rect2.height + finalSpacing;
      node1.position.y = newY;
      
      if (newY > 1200) {
        const horizontalShift = findHorizontalSpace(nodes, node1, rect1.width);
        if (horizontalShift !== null) {
          node1.position.x = horizontalShift;
          node1.position.y = Math.max(40, rect2.y);
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

/**
 * Get node rectangle for collision detection (simple version)
 */
function getNodeRect(node: Node) {
  const width = (node as any).measured?.width || 320;
  const height = (node as any).measured?.height || getEstimatedNodeHeight(node);
  
  return {
    x: node.position.x,
    y: node.position.y,
    width,
    height
  };
}

function getEstimatedNodeHeight(node: Node): number {
  const data = node.data as any;
  
  if (data.block && data.block.courses) {
    const courseCount = data.block.courses.length;
    
    // Optimized height calculation with 10% safety margin
    let height = 140; // Base card height (title, progress, unlock status)
    height += courseCount * 56; // Each course row
    
    // Account for specializations (subBlocks)
    if (data.subBlocks && data.subBlocks.length > 0) {
      height += 100; // Collapsible header
      if (data.subBlocksExpanded) {
        height += data.subBlocks.length * 64; // Each specialization
      }
    }
    
    // Account for alt credit options
    if (data.altCreditOptions && data.altCreditOptions.length > 0) {
      height += data.altCreditOptions.length * 48;
    }
    
    // Apply 10% safety margin instead of 20%
    return Math.floor(height * 1.1);
  }
  
  // Terminal or simple nodes - reduced default with 10% safety margin
  return Math.floor(180 * 1.1);
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
 * Get node type for adaptive spacing
 */
function getNodeType(node1: Node, node2: Node): 'terminal' | 'course' | 'blockgroup' {
  const data1 = node1.data as any;
  const data2 = node2.data as any;
  
  // Check if either node is a terminal node
  if (data1.block?.title?.toLowerCase().includes('degree') || data2.block?.title?.toLowerCase().includes('degree')) {
    return 'terminal';
  }
  
  // Check if either node has courses (BlockGroup)
  if (data1.block?.courses?.length > 0 || data2.block?.courses?.length > 0) {
    return 'blockgroup';
  }
  
  // Default to course node
  return 'course';
}

/**
 * Get adaptive spacing based on node type
 */
function getAdaptiveSpacing(nodeType: 'terminal' | 'course' | 'blockgroup'): number {
  switch (nodeType) {
    case 'terminal':
      return 30; // Terminal nodes are smaller, need less space
    case 'course':
      return 40; // Medium spacing for course nodes
    case 'blockgroup':
      return 50; // Block groups are larger, need more space
    default:
      return 40;
  }
}

/**
 * Check if two rectangles overlap with buffer to prevent touching nodes
 */
function hasOverlap(rect1: any, rect2: any): boolean {
  const buffer = 40; // Consistent 40px minimum spacing
  return !(rect1.x + rect1.width + buffer <= rect2.x || 
           rect2.x + rect2.width + buffer <= rect1.x || 
           rect1.y + rect1.height + buffer <= rect2.y || 
           rect2.y + rect2.height + buffer <= rect1.y);
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