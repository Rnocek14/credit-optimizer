import { Node } from '@xyflow/react';

/**
 * Enhanced collision resolution with smart height estimation
 * Now deprecated in favor of the new collision resolver system
 */
export function resolveColumnCollisions(nodes: Node[]): Node[] {
  console.warn('resolveColumnCollisions is deprecated, use resolveAllCollisions from collisionResolver instead');
  
  const PAD = 24; // Increased padding for better visual separation
  const COL_W = 360; // Slightly wider column detection
  
  // Group nodes by approximate column (rounded X position)
  const columnGroups = new Map<number, Node[]>();
  
  nodes.forEach(node => {
    const columnKey = Math.round(node.position.x / COL_W) * COL_W;
    if (!columnGroups.has(columnKey)) {
      columnGroups.set(columnKey, []);
    }
    columnGroups.get(columnKey)!.push(node);
  });

  // Process each column to remove overlaps
  columnGroups.forEach((nodesInColumn) => {
    // Sort by Y position
    nodesInColumn.sort((a, b) => a.position.y - b.position.y);
    
    // Adjust positions to prevent overlap
    for (let i = 1; i < nodesInColumn.length; i++) {
      const prevNode = nodesInColumn[i - 1];
      const currNode = nodesInColumn[i];
      
      // Smart height estimation
      const prevHeight = estimateNodeHeight(prevNode);
      
      // Calculate target position with 8pt rhythm alignment
      const rawTargetTop = prevNode.position.y + prevHeight + PAD;
      const targetTop = Math.ceil(rawTargetTop / 8) * 8; // Align to 8pt grid
      
      if (currNode.position.y < targetTop) {
        currNode.position.y = targetTop;
      }
    }
  });

  return nodes;
}

/**
 * Smart height estimation
 */
function estimateNodeHeight(node: Node): number {
  // Use measured height if available
  if (node.measured?.height) {
    return node.measured.height;
  }
  
  // Use data.measuredHeight if available
  if (typeof node.data?.measuredHeight === 'number') {
    return node.data.measuredHeight;
  }
  
  // Smart estimation based on content
  if (node.type === 'blockGroup') {
    const data = node.data as any;
    const baseHeight = 120;
    const courseCount = data.block?.courses?.length || 3;
    const subBlockCount = data.subBlocks?.length || 0;
    
    return baseHeight + (courseCount * 60) + (subBlockCount * 80);
  }
  
  return 200; // Fallback
}

/**
 * Debounced layout trigger to prevent excessive re-layouts
 */
export class LayoutManager {
  private layoutTimeout: NodeJS.Timeout | null = null;
  
  constructor(private onLayoutNeeded: () => void) {}
  
  triggerLayout(delay = 150) {
    if (this.layoutTimeout) {
      clearTimeout(this.layoutTimeout);
    }
    
    this.layoutTimeout = setTimeout(() => {
      this.onLayoutNeeded();
      this.layoutTimeout = null;
    }, delay);
  }
  
  cleanup() {
    if (this.layoutTimeout) {
      clearTimeout(this.layoutTimeout);
      this.layoutTimeout = null;
    }
  }
}