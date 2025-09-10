import { Node, Edge } from '@xyflow/react';

/**
 * Simplified layout system focused on eliminating overlaps
 * Two-stage process: Year-based positioning → Collision resolution
 */

export interface LayoutResult {
  nodes: Node[];
  hasOverlaps: boolean;
  layoutTime: number;
}

/**
 * Main layout function - simplified pipeline
 */
export async function layoutNodes(nodes: Node[], edges: Edge[]): Promise<LayoutResult> {
  const startTime = performance.now();
  
  console.log(`🎯 Starting layout for ${nodes.length} nodes`);
  
  // Stage 1: Year-based column positioning
  let layoutedNodes = applyYearBasedLayout(nodes);
  
  // Stage 2: Resolve any collisions
  layoutedNodes = resolveCollisions(layoutedNodes);
  
  // Stage 3: Validation
  const hasOverlaps = detectOverlaps(layoutedNodes).length > 0;
  const layoutTime = performance.now() - startTime;
  
  console.log(`✅ Layout complete: ${hasOverlaps ? 'HAS OVERLAPS' : 'NO OVERLAPS'} (${layoutTime.toFixed(1)}ms)`);
  
  return {
    nodes: layoutedNodes,
    hasOverlaps,
    layoutTime
  };
}

/**
 * Apply year-based column layout
 */
function applyYearBasedLayout(nodes: Node[]): Node[] {
  const yearColumns = [80, 440, 800, 1160]; // Year 1-4 columns (320px width + 120px spacing)
  const nodesByYear = new Map<number, Node[]>();
  
  // Group nodes by year
  nodes.forEach(node => {
    const data = node.data as any;
    const year = data.level_year ?? 1;
    if (!nodesByYear.has(year)) {
      nodesByYear.set(year, []);
    }
    nodesByYear.get(year)!.push(node);
  });
  
  // Sort nodes within each year by area/priority
  nodesByYear.forEach(yearNodes => {
    yearNodes.sort((a, b) => {
      const aData = a.data as any;
      const bData = b.data as any;
      return (aData.sortOrder ?? 0) - (bData.sortOrder ?? 0);
    });
  });
  
  return nodes.map(node => {
    const data = node.data as any;
    const year = data.level_year ?? 1;
    const yearNodes = nodesByYear.get(year) || [];
    const nodeIndex = yearNodes.findIndex(n => n.id === node.id);
    
    return {
      ...node,
      position: {
        x: yearColumns[year - 1] ?? 80,
        y: nodeIndex * 180 + 40 // Stack vertically with generous spacing
      }
    };
  });
}

/**
 * Simple collision resolution
 */
function resolveCollisions(nodes: Node[]): Node[] {
  const resolvedNodes = [...nodes];
  let maxPasses = 3;
  let pass = 0;
  
  while (pass < maxPasses) {
    const overlaps = detectOverlaps(resolvedNodes);
    
    if (overlaps.length === 0) {
      console.log(`✅ No overlaps after ${pass} passes`);
      break;
    }
    
    console.log(`🔄 Pass ${pass + 1}: Resolving ${overlaps.length} overlaps`);
    
    // Resolve each overlap by moving the lower node down
    overlaps.forEach(({ node1, node2 }) => {
      const rect1 = getNodeBounds(node1);
      const rect2 = getNodeBounds(node2);
      
      // Move the lower positioned node down
      if (node2.position.y >= node1.position.y) {
        node2.position.y = rect1.y + rect1.height + 32; // 32px spacing
      } else {
        node1.position.y = rect2.y + rect2.height + 32;
      }
    });
    
    pass++;
  }
  
  if (pass >= maxPasses) {
    console.warn('⚠️ Max collision resolution passes reached');
  }
  
  return resolvedNodes;
}

/**
 * Detect overlapping nodes
 */
function detectOverlaps(nodes: Node[]): { node1: Node; node2: Node }[] {
  const overlaps: { node1: Node; node2: Node }[] = [];
  
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const node1 = nodes[i];
      const node2 = nodes[j];
      
      const rect1 = getNodeBounds(node1);
      const rect2 = getNodeBounds(node2);
      
      if (hasOverlap(rect1, rect2)) {
        overlaps.push({ node1, node2 });
      }
    }
  }
  
  return overlaps;
}

/**
 * Get node bounds for collision detection
 */
function getNodeBounds(node: Node) {
  const width = node.type === 'blockGroup' ? 320 : 200;
  const height = estimateNodeHeight(node);
  
  return {
    x: node.position.x,
    y: node.position.y,
    width,
    height
  };
}

/**
 * Check if two rectangles overlap (with small buffer)
 */
function hasOverlap(rect1: any, rect2: any): boolean {
  const buffer = 8; // Small buffer to prevent touching nodes
  return !(rect1.x + rect1.width + buffer < rect2.x || 
           rect2.x + rect2.width + buffer < rect1.x || 
           rect1.y + rect1.height + buffer < rect2.y || 
           rect2.y + rect2.height + buffer < rect1.y);
}

/**
 * Estimate node height based on content
 */
function estimateNodeHeight(node: Node): number {
  if (node.type === 'blockGroup') {
    const data = node.data as any;
    const baseHeight = 140; // Header + progress + padding
    const courseCount = data.block?.courses?.length || 3;
    const subBlockCount = data.subBlocks?.length || 0;
    
    return baseHeight + (courseCount * 56) + (subBlockCount * 72);
  }
  return 120;
}