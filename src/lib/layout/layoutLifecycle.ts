import { Node } from '@xyflow/react';

/**
 * Post-ELK cleanup to resolve any remaining overlaps by column
 * This is a safety net for the improved ELK configuration
 */
export function resolveColumnCollisions(nodes: Node[]): Node[] {
  const padding = 16;
  
  // Group nodes by approximate column (rounded X position)
  const columnGroups = new Map<number, Node[]>();
  
  nodes.forEach(node => {
    const columnKey = Math.round(node.position.x / 320) * 320;
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
      
      const prevBottom = prevNode.position.y + (prevNode.measured?.height ?? 180);
      const targetTop = prevBottom + padding;
      
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