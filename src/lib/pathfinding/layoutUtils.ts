/**
 * Layout utilities for Visual V2 - node nudging and detour routing
 */

export interface NodeRect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface NodePosition {
  id: string;
  x: number;
  y: number;
}

/**
 * Nudge overlapping nodes apart in multiple passes
 * Helps reduce NODE_OVERLAP issues in the Visual Scanner
 */
export function nudgeOverlappingNodes(
  nodes: NodePosition[],
  nodeWidth = 280,
  nodeHeight = 120,
  padding = 12,
  passes = 3
): NodePosition[] {
  const result = [...nodes];
  const w = nodeWidth + padding;
  const h = nodeHeight + padding;

  for (let pass = 0; pass < passes; pass++) {
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const a = result[i];
        const b = result[j];
        
        const ax = a.x, ay = a.y;
        const bx = b.x, by = b.y;
        
        // Check for overlap
        const xOverlap = Math.min(ax + w, bx + w) - Math.max(ax, bx);
        const yOverlap = Math.min(ay + h, by + h) - Math.max(ay, by);
        
        if (xOverlap > 0 && yOverlap > 0) {
          // Calculate push direction and amount
          const pushX = (xOverlap / 2 + 2) * (ax <= bx ? -1 : 1);
          const pushY = (yOverlap / 2 + 2) * (ay <= by ? -1 : 1);
          
          // Apply nudges
          a.x += pushX;
          b.x -= pushX;
          a.y += pushY;
          b.y -= pushY;
        }
      }
    }
  }
  
  return result;
}

/**
 * Snap nodes to vertical lanes to reduce edge crossings
 * Helps organize nodes into disciplined columns
 */
export function snapToLanes(
  nodes: NodePosition[],
  lanes: { [key: string]: number } = {
    foundations: 200,
    major: 560,
    upper: 920,
    career: 1280,
    transfer: 740
  },
  defaultLane = 'major'
): NodePosition[] {
  return nodes.map(node => {
    // Simple heuristic based on node ID or position
    let targetLane = defaultLane;
    
    // You can add logic here to determine the appropriate lane
    // For now, we'll use a simple position-based approach
    const currentX = node.x;
    let closestLane = defaultLane;
    let minDistance = Infinity;
    
    for (const [laneKey, laneX] of Object.entries(lanes)) {
      const distance = Math.abs(currentX - laneX);
      if (distance < minDistance) {
        minDistance = distance;
        closestLane = laneKey;
      }
    }
    
    return {
      ...node,
      x: lanes[closestLane]
    };
  });
}

/**
 * Generate a detour path that avoids node rectangles
 * This is a simple implementation - can be enhanced for better routing
 */
export function routeWithDetours(
  source: { x: number; y: number },
  target: { x: number; y: number },
  sourcePos: 'left' | 'right' | 'top' | 'bottom',
  targetPos: 'left' | 'right' | 'top' | 'bottom',
  obstacles: NodeRect[],
  padding = 28
): { x: number; y: number }[] {
  // Initial anchor points with padding
  let x1 = sourcePos === 'right' ? source.x + padding : sourcePos === 'left' ? source.x - padding : source.x;
  let y1 = sourcePos === 'bottom' ? source.y + padding : sourcePos === 'top' ? source.y - padding : source.y;
  let x2 = targetPos === 'left' ? target.x - padding : targetPos === 'right' ? target.x + padding : target.x;
  let y2 = targetPos === 'top' ? target.y - padding : targetPos === 'bottom' ? target.y + padding : target.y;

  // Propose a mid-lane for routing
  const midX = (x1 + x2) / 2;

  // Check if any obstacle intersects the vertical line at midX
  const collides = (mx: number) =>
    obstacles.some(rect => 
      mx >= rect.x - 8 && 
      mx <= rect.x + rect.w + 8 && 
      !(Math.max(y1, y2) < rect.y - 8 || Math.min(y1, y2) > rect.y + rect.h + 8)
    );

  // Find a clear lane
  let laneX = midX;
  for (const offset of [0, 40, -40, 80, -80, 120, -120]) {
    if (!collides(midX + offset)) {
      laneX = midX + offset;
      break;
    }
  }

  // Return waypoints for the detour path
  return [
    { x: x1, y: y1 },
    { x: laneX, y: y1 },
    { x: laneX, y: y2 },
    { x: x2, y: y2 }
  ];
}