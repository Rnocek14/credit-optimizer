import { Node, Edge } from '@xyflow/react';

/**
 * Post-ELK cleanup to resolve any remaining overlaps by column
 * Enhanced with double-pass collision resolution and prerequisite anchoring
 */
export function resolveColumnCollisions(nodes: Node[], edges: Edge[] = []): Node[] {
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

  // Apply prerequisite anchoring first (Year 3+ nodes below their prerequisites)
  const prerequisiteAnchoredNodes = anchorNodesUnderPrerequisites(nodes, edges);
  
  // Double-pass collision resolution for first-paint stability
  for (let pass = 0; pass < 2; pass++) {
    // Process each column to remove overlaps
    columnGroups.forEach((nodesInColumn) => {
      // Sort by Y position
      nodesInColumn.sort((a, b) => a.position.y - b.position.y);
      
      // Adjust positions to prevent overlap
      for (let i = 1; i < nodesInColumn.length; i++) {
        const prevNode = nodesInColumn[i - 1];
        const currNode = nodesInColumn[i];
        
        // Use measured height if available, with enhanced fallbacks
        const prevHeight: number = prevNode.measured?.height ?? 
                           (typeof prevNode.data?.measuredHeight === 'number' ? prevNode.data.measuredHeight : 
                            estimateNodeHeight(prevNode));
        
        // Calculate target position with 8pt rhythm alignment
        const rawTargetTop = prevNode.position.y + prevHeight + PAD;
        const targetTop = Math.ceil(rawTargetTop / 8) * 8; // Align to 8pt grid
        
        if (currNode.position.y < targetTop) {
          currNode.position.y = targetTop;
        }
      }
    });
    
    // Rebuild column groups for second pass if needed
    if (pass === 0) {
      columnGroups.clear();
      prerequisiteAnchoredNodes.forEach(node => {
        const columnKey = Math.round(node.position.x / COL_W) * COL_W;
        if (!columnGroups.has(columnKey)) {
          columnGroups.set(columnKey, []);
        }
        columnGroups.get(columnKey)!.push(node);
      });
    }
  }

  return prerequisiteAnchoredNodes;
}

/**
 * Estimate node height based on content for better first-paint layout
 */
function estimateNodeHeight(node: Node): number {
  const BASE_HEIGHT = 180;
  const COURSE_ROW_HEIGHT = 36;
  const HEADER_HEIGHT = 80;
  
  if (node.type === 'blockGroup' && node.data?.block) {
    const block = node.data.block as any;
    if (block.courses) {
      const courseCount = block.courses.length;
      const estimatedRows = Math.ceil(courseCount / 2);
      return BASE_HEIGHT + (estimatedRows * COURSE_ROW_HEIGHT);
    }
  } else if (node.type === 'placeholderGroup') {
    return 220; // Placeholder nodes are typically taller
  } else if (node.type === 'terminal') {
    return 280; // Terminal nodes are the tallest
  }
  
  return 200; // Default fallback
}

/**
 * Anchor nodes under their prerequisites to prevent Year-3 drift
 */
function anchorNodesUnderPrerequisites(nodes: Node[], edges: Edge[]): Node[] {
  const nodeMap = new Map(nodes.map(node => [node.id, { ...node }]));
  const MIN_GAP = 32;
  
  // Build prerequisite relationships
  const prerequisites = new Map<string, string[]>();
  edges.forEach(edge => {
    if (!prerequisites.has(edge.target)) {
      prerequisites.set(edge.target, []);
    }
    prerequisites.get(edge.target)!.push(edge.source);
  });
  
  // For each node with prerequisites, ensure it's positioned below them
  nodes.forEach(node => {
    const nodePrereqs = prerequisites.get(node.id) || [];
    if (nodePrereqs.length > 0) {
      const prereqNodes = nodePrereqs
        .map(prereqId => nodeMap.get(prereqId))
        .filter(Boolean);
      
      if (prereqNodes.length > 0) {
        const maxPrereqBottom = Math.max(
          ...prereqNodes.map(prereq => {
            const height = prereq!.measured?.height ?? 
                          (typeof prereq!.data?.measuredHeight === 'number' ? prereq!.data.measuredHeight : 200);
            return prereq!.position.y + height;
          })
        );
        
        const targetY = maxPrereqBottom + MIN_GAP;
        const currentNode = nodeMap.get(node.id)!;
        if (currentNode.position.y < targetY) {
          currentNode.position.y = Math.ceil(targetY / 8) * 8; // 8pt grid alignment
        }
      }
    }
  });
  
  return Array.from(nodeMap.values());
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