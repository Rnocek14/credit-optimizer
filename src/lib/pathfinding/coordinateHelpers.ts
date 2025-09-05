import { XYPosition } from '@xyflow/react';

export interface DOMPoint {
  x: number;
  y: number;
}

export interface RFPoint {
  x: number;
  y: number;
}

/**
 * Convert DOM coordinates to React Flow viewport coordinates
 */
export function toViewport(
  point: DOMPoint, 
  rf: { project: (position: XYPosition) => XYPosition }
): RFPoint {
  return rf.project({ x: point.x, y: point.y });
}

/**
 * Convert React Flow viewport coordinates to DOM screen coordinates
 */
export function toScreen(
  point: RFPoint,
  rf: { 
    getViewport: () => { x: number; y: number; zoom: number };
    flowToScreenPosition: (position: XYPosition) => XYPosition;
  }
): DOMPoint {
  const screenPos = rf.flowToScreenPosition({ x: point.x, y: point.y });
  return { x: screenPos.x, y: screenPos.y };
}

/**
 * Get live node dimensions from React Flow
 */
export function getLiveNodeBoxes(
  rf: { getNodes: () => any[] }
): Map<string, { x: number; y: number; width: number; height: number }> {
  const nodeBoxes = new Map();
  
  const nodes = rf.getNodes();
  nodes.forEach(node => {
    // Use measured dimensions if available, fallback to defaults
    const width = node.measured?.width || node.width || 240;
    const height = node.measured?.height || node.height || 120;
    
    nodeBoxes.set(node.id, {
      x: node.position.x,
      y: node.position.y,
      width,
      height
    });
  });
  
  return nodeBoxes;
}

/**
 * Snap position to grid for consistent layout
 */
export function snapToGrid(
  position: XYPosition, 
  gridSize = 16
): XYPosition {
  return {
    x: Math.round(position.x / gridSize) * gridSize,
    y: Math.round(position.y / gridSize) * gridSize
  };
}