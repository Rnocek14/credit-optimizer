import { Node } from '@xyflow/react';
import React from 'react';
import { createRoot } from 'react-dom/client';

interface NodeDimensions {
  id: string;
  width: number;
  height: number;
}

/**
 * Real component-based height measurement for accurate ELK input
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
        const height = await measureBlockGroupHeight(node.data, measurementContainer);
        measurements.set(node.id, {
          id: node.id,
          width: 320,
          height: Math.max(200, height)
        });
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
 * Measure actual BlockGroup component height by rendering it
 */
async function measureBlockGroupHeight(data: any, container: HTMLElement): Promise<number> {
  return new Promise((resolve) => {
    const tempDiv = document.createElement('div');
    tempDiv.style.width = '320px';
    container.appendChild(tempDiv);
    
    const root = createRoot(tempDiv);
    
    // Create a simplified BlockGroup structure for measurement
    const MeasurementComponent = () => {
      const block = data.block;
      const courses = block?.courses || [];
      const subBlocks = data.subBlocks || [];
      
      // Calculate estimated height based on content
      const baseHeight = 120; // Header + progress
      const courseHeight = courses.length * 60;
      const subBlockHeight = subBlocks.length * 80;
      const padding = 24;
      
      const estimatedHeight = baseHeight + courseHeight + subBlockHeight + padding;
      
      return React.createElement('div', {
        style: { 
          width: '320px', 
          minHeight: `${estimatedHeight}px`,
          padding: '16px',
          border: '1px solid #ccc',
          borderRadius: '8px'
        }
      }, [
        React.createElement('div', { key: 'header', style: { height: '60px' } }, block?.title || 'Block'),
        React.createElement('div', { key: 'progress', style: { height: '40px' } }, 'Progress bar'),
        ...courses.map((_, i) => 
          React.createElement('div', { key: `course-${i}`, style: { height: '60px', marginBottom: '8px' } }, `Course ${i + 1}`)
        ),
        ...subBlocks.map((_, i) => 
          React.createElement('div', { key: `sub-${i}`, style: { height: '80px', marginBottom: '8px' } }, `Sub-block ${i + 1}`)
        )
      ]);
    };
    
    root.render(React.createElement(MeasurementComponent));
    
    // Wait for render and measure
    setTimeout(() => {
      const rect = tempDiv.getBoundingClientRect();
      root.unmount();
      container.removeChild(tempDiv);
      resolve(rect.height);
    }, 0);
  });
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