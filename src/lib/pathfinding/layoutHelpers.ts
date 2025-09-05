// Layout helpers for Visual V2
// Provides lane snapping and overlap prevention

import { Node } from '@xyflow/react';

export interface LaneConfig {
  foundations: number;
  major: number;
  upper: number;
  transfer: number;
  career: number;
}

export const DEFAULT_LANES: LaneConfig = {
  foundations: 200,
  major: 560,
  upper: 920,
  transfer: 740,
  career: 1280
};

/**
 * Snaps nodes to predefined lanes to reduce crossings
 */
export function snapToLanes(nodes: Node[], lanes: LaneConfig = DEFAULT_LANES): Node[] {
  return nodes.map(node => {
    const nodeData = node.data?.node as any; // Type assertion for node data
    if (!nodeData || !nodeData.type) return node;

    // Determine which lane this node should use
    let targetLane = lanes.major; // default
    
    if (nodeData.type === 'skill') {
      targetLane = lanes.foundations;
    } else if (nodeData.type === 'course') {
      targetLane = lanes.major;
    } else if (nodeData.type === 'creditBlock') {
      targetLane = lanes.upper;
    } else if (nodeData.type === 'credential') {
      targetLane = lanes.career;
    } else if (nodeData.type === 'transfer') {
      targetLane = lanes.transfer;
    }

    // Snap to nearest lane
    const laneValues = Object.values(lanes);
    const nearest = laneValues.reduce((prev, curr) => 
      Math.abs(curr - node.position.x) < Math.abs(prev - node.position.x) ? curr : prev
    );

    return {
      ...node,
      position: {
        ...node.position,
        x: nearest
      }
    };
  });
}

/**
 * Prevents node overlaps by nudging overlapping nodes apart
 */
export function nudgeOverlaps(nodes: Node[], maxIterations = 3): Node[] {
  let result = [...nodes];
  
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let hasOverlaps = false;
    
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const nodeA = result[i];
        const nodeB = result[j];
        
        const rectA = getNodeRect(nodeA);
        const rectB = getNodeRect(nodeB);
        
        const overlap = calculateOverlap(rectA, rectB);
        if (overlap.area > 12) { // Use same threshold as scanner
          hasOverlaps = true;
          
          // Calculate nudge direction and distance
          const nudgeX = (overlap.width / 2) + 2;
          const nudgeY = (overlap.height / 2) + 2;
          
          // Nudge in opposite directions
          const centerAX = rectA.x + rectA.width / 2;
          const centerBX = rectB.x + rectB.width / 2;
          const centerAY = rectA.y + rectA.height / 2;
          const centerBY = rectB.y + rectB.height / 2;
          
          if (centerAX < centerBX) {
            result[i] = { ...nodeA, position: { ...nodeA.position, x: nodeA.position.x - nudgeX } };
            result[j] = { ...nodeB, position: { ...nodeB.position, x: nodeB.position.x + nudgeX } };
          } else {
            result[i] = { ...nodeA, position: { ...nodeA.position, x: nodeA.position.x + nudgeX } };
            result[j] = { ...nodeB, position: { ...nodeB.position, x: nodeB.position.x - nudgeX } };
          }
          
          if (centerAY < centerBY) {
            result[i] = { ...result[i], position: { ...result[i].position, y: result[i].position.y - nudgeY } };
            result[j] = { ...result[j], position: { ...result[j].position, y: result[j].position.y + nudgeY } };
          } else {
            result[i] = { ...result[i], position: { ...result[i].position, y: result[i].position.y + nudgeY } };
            result[j] = { ...result[j], position: { ...result[j].position, y: result[j].position.y - nudgeY } };
          }
        }
      }
    }
    
    if (!hasOverlaps) break;
  }
  
  return result;
}

/**
 * Gets the bounding rectangle for a node
 */
function getNodeRect(node: Node) {
  // Assume standard node dimensions
  const width = 240;
  const height = 120;
  
  return {
    x: node.position.x,
    y: node.position.y,
    width,
    height
  };
}

/**
 * Calculates overlap between two rectangles
 */
function calculateOverlap(rectA: any, rectB: any) {
  const left = Math.max(rectA.x, rectB.x);
  const right = Math.min(rectA.x + rectA.width, rectB.x + rectB.width);
  const top = Math.max(rectA.y, rectB.y);
  const bottom = Math.min(rectA.y + rectA.height, rectB.y + rectB.height);
  
  const width = Math.max(0, right - left);
  const height = Math.max(0, bottom - top);
  const area = width * height;
  
  return { width, height, area };
}