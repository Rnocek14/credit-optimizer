import { Node } from '@xyflow/react';

interface NodeDimensions {
  id: string;
  width: number;
  height: number;
}

/**
 * Pre-measures node heights by rendering them in a hidden container
 * This gives ELK accurate dimensions to work with
 */
export async function measureNodeHeights(nodes: Node[]): Promise<Map<string, NodeDimensions>> {
  const measurements = new Map<string, NodeDimensions>();
  
  // Create a hidden measurement container
  const measurementContainer = document.createElement('div');
  measurementContainer.style.cssText = `
    position: absolute;
    top: -9999px;
    left: -9999px;
    visibility: hidden;
    pointer-events: none;
    width: 320px;
  `;
  document.body.appendChild(measurementContainer);

  try {
    for (const node of nodes) {
      if (node.type === 'blockGroup') {
        const mockElement = createMockBlockGroup(node.data);
        measurementContainer.appendChild(mockElement);
        
        // Force layout calculation
        const rect = mockElement.getBoundingClientRect();
        measurements.set(node.id, {
          id: node.id,
          width: Math.max(320, rect.width),
          height: Math.max(200, rect.height)
        });
        
        measurementContainer.removeChild(mockElement);
      } else {
        // Fallback for other node types
        measurements.set(node.id, {
          id: node.id,
          width: 200,
          height: 100
        });
      }
    }
  } finally {
    document.body.removeChild(measurementContainer);
  }

  return measurements;
}

/**
 * Creates a simplified DOM structure that matches BlockGroup for measurement
 */
function createMockBlockGroup(data: any): HTMLElement {
  const element = document.createElement('div');
  element.className = 'min-w-[320px] max-w-[320px]';
  
  // Estimate height based on content
  const baseHeight = 120; // Header + progress
  const courseHeight = data.block?.courses?.length ? data.block.courses.length * 60 : 100;
  const subBlockHeight = data.subBlocks?.length ? data.subBlocks.length * 80 : 0;
  
  const estimatedHeight = baseHeight + courseHeight + subBlockHeight;
  element.style.height = `${estimatedHeight}px`;
  
  return element;
}

/**
 * Enhanced collision detection that accounts for actual content
 */
export function detectCollisions(nodes: Node[]): { node1: Node; node2: Node; overlap: number }[] {
  const collisions: { node1: Node; node2: Node; overlap: number }[] = [];
  
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const node1 = nodes[i];
      const node2 = nodes[j];
      
      const rect1 = getNodeRect(node1);
      const rect2 = getNodeRect(node2);
      
      const overlap = calculateOverlap(rect1, rect2);
      if (overlap > 0) {
        collisions.push({ node1, node2, overlap });
      }
    }
  }
  
  return collisions;
}

/**
 * Get node rectangle with measured or estimated dimensions
 */
function getNodeRect(node: Node) {
  const width = node.measured?.width ?? (node.type === 'blockGroup' ? 320 : 200);
  const height = node.measured?.height ?? estimateNodeHeight(node);
  
  return {
    x: node.position.x,
    y: node.position.y,
    width,
    height
  };
}

/**
 * Smart height estimation based on node content
 */
function estimateNodeHeight(node: Node): number {
  if (node.type === 'blockGroup') {
    const data = node.data as any;
    const baseHeight = 120;
    const courseCount = data.block?.courses?.length || 3;
    const subBlockCount = data.subBlocks?.length || 0;
    
    return baseHeight + (courseCount * 60) + (subBlockCount * 80);
  }
  return 100;
}

/**
 * Calculate overlap between two rectangles
 */
function calculateOverlap(rect1: any, rect2: any): number {
  const xOverlap = Math.max(0, Math.min(rect1.x + rect1.width, rect2.x + rect2.width) - Math.max(rect1.x, rect2.x));
  const yOverlap = Math.max(0, Math.min(rect1.y + rect1.height, rect2.y + rect2.height) - Math.max(rect1.y, rect2.y));
  
  return xOverlap * yOverlap;
}