import { Node } from '@xyflow/react';

/**
 * Post-ELK cleanup to resolve any remaining overlaps by column
 * Enhanced with 8pt rhythm and measured height support
 */
export function resolveColumnCollisions(nodes: Node[]): Node[] {
  const PAD = 16; // 8pt rhythm padding
  const COL_W = 320;
  
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
      
      // Use measured height if available, fallback to data.measuredHeight, then default
      const prevHeight: number = prevNode.measured?.height ?? 
                         (typeof prevNode.data?.measuredHeight === 'number' ? prevNode.data.measuredHeight : 200);
      
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