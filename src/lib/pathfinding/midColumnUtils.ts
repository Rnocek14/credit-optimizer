// C3: Mid-column detour utilities for long vertical runs
import { Node } from '@xyflow/react';

/**
 * Find a clear mid-column position for routing long edges
 */
export function findClearMidColumn(nodes: Node[]): number {
  if (!nodes.length) return 640; // Default mid position
  
  // Get all node x positions
  const xPositions = nodes.map(n => n.position.x);
  const minX = Math.min(...xPositions);
  const maxX = Math.max(...xPositions);
  
  // Find the middle range
  const midRange = minX + (maxX - minX) / 2;
  
  // Look for gaps around the middle
  const sorted = [...xPositions].sort((a, b) => a - b);
  
  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = sorted[i + 1] - sorted[i];
    const gapMid = sorted[i] + gap / 2;
    
    // If this gap is near the middle and wide enough
    if (Math.abs(gapMid - midRange) < 200 && gap > 160) {
      return gapMid;
    }
  }
  
  return midRange;
}

/**
 * Check if an edge should use mid-column detour
 */
export function shouldUseMidColumn(source: { x: number }, target: { x: number }): boolean {
  return Math.abs(source.x - target.x) > 320; // More than 2 column widths
}