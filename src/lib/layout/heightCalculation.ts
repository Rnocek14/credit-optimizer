import { Node } from '@xyflow/react';

/**
 * Unified height calculation system for consistent layout
 * Used across all layout systems to ensure accurate positioning
 */

export interface NodeDimensions {
  width: number;
  height: number;
  minHeight: number;
  contentHeight: number;
}

/**
 * Calculate accurate dimensions for a block group node
 */
export function calculateNodeDimensions(node: Node): NodeDimensions {
  if (node.type !== 'blockGroup') {
    return {
      width: 200,
      height: 120,
      minHeight: 120,
      contentHeight: 100
    };
  }

  const data = node.data as any;
  const block = data.block;
  
  // Base dimensions
  const width = 320; // Fixed width for block groups
  let contentHeight = 0;
  
  // Header section (title, area badge, progress bar)
  contentHeight += 80;
  
  // Course list section
  const courseCount = block?.courses?.length || 0;
  if (courseCount > 0) {
    // Course header + course items
    contentHeight += 32 + (courseCount * 52);
  }
  
  // Sub-blocks section (if any)
  const subBlockCount = data.subBlocks?.length || 0;
  if (subBlockCount > 0) {
    contentHeight += 24 + (subBlockCount * 80);
  }
  
  // Alt credits section
  if (block?.alt_credits && block.alt_credits > 0) {
    contentHeight += 40;
  }
  
  // Action buttons section
  contentHeight += 48;
  
  // Expansion state adjustments
  if (data.isExpanded) {
    contentHeight += 20; // Extra padding when expanded
  }
  
  // Padding and borders
  const padding = 24;
  const totalHeight = contentHeight + padding;
  
  // Minimum height constraint
  const minHeight = 180;
  const finalHeight = Math.max(totalHeight, minHeight);
  
  return {
    width,
    height: finalHeight,
    minHeight,
    contentHeight
  };
}

/**
 * Get node bounds for collision detection
 */
export function getNodeBounds(node: Node) {
  const dimensions = calculateNodeDimensions(node);
  
  return {
    x: node.position.x,
    y: node.position.y,
    width: dimensions.width,
    height: dimensions.height
  };
}

/**
 * Calculate optimal spacing between nodes
 */
export function calculateOptimalSpacing(node1: Node, node2: Node): number {
  const dims1 = calculateNodeDimensions(node1);
  const dims2 = calculateNodeDimensions(node2);
  
  // Base spacing
  let spacing = 48;
  
  // Increase spacing for nodes with more content
  if (dims1.height > 300 || dims2.height > 300) {
    spacing = 64;
  }
  
  // Minimum spacing for very tall nodes
  if (dims1.height > 500 || dims2.height > 500) {
    spacing = 80;
  }
  
  return spacing;
}

/**
 * Estimate total height required for a column of nodes
 */
export function estimateColumnHeight(nodes: Node[]): number {
  if (nodes.length === 0) return 0;
  
  let totalHeight = 40; // Initial top padding
  
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const dimensions = calculateNodeDimensions(node);
    totalHeight += dimensions.height;
    
    // Add spacing between nodes (except for the last one)
    if (i < nodes.length - 1) {
      const nextNode = nodes[i + 1];
      totalHeight += calculateOptimalSpacing(node, nextNode);
    }
  }
  
  totalHeight += 40; // Bottom padding
  
  return totalHeight;
}

/**
 * Check if nodes should be distributed horizontally due to column height
 */
export function shouldDistributeHorizontally(nodes: Node[], maxColumnHeight: number = 800): boolean {
  const estimatedHeight = estimateColumnHeight(nodes);
  return estimatedHeight > maxColumnHeight && nodes.length > 3;
}