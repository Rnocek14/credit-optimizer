import { Node } from '@xyflow/react';

/**
 * Lane scaffold system for stable positioning
 * Creates invisible anchor nodes per Year/Area to prevent column jitter
 */
export interface LaneScaffold {
  yearLanes: { [year: number]: number };
  areaLanes: { [area: string]: number };
}

export const DEFAULT_LANE_SCAFFOLD: LaneScaffold = {
  yearLanes: {
    1: 200,   // Year 1 lane center
    2: 600,   // Year 2 lane center  
    3: 1000,  // Year 3 lane center
    4: 1400   // Year 4 lane center
  },
  areaLanes: {
    'foundation': 0,
    'mathematics': 200,
    'general_education': 400,
    'core': 600,
    'specialization': 800,
    'software_engineering': 1000,
    'capstone': 1200
  }
};

/**
 * Apply lane scaffolding intelligently - only adjust X positions, preserve ELK's Y layout
 */
export function applyLaneScaffolding(nodes: Node[], scaffold: LaneScaffold = DEFAULT_LANE_SCAFFOLD): Node[] {
  return nodes.map(node => {
    const data = node.data as any;
    const yearLane = scaffold.yearLanes[data.level_year];
    
    // Only apply X positioning if we have a defined lane
    if (yearLane !== undefined) {
      return {
        ...node,
        position: {
          x: yearLane - 160, // Center the 320px wide node on the lane
          y: node.position.y  // Preserve ELK's Y positioning
        }
      };
    }
    
    return node;
  });
}

/**
 * Legacy function - now calls applyLaneScaffolding
 * @deprecated Use applyLaneScaffolding instead
 */
export function snapToLanes(nodes: Node[], scaffold: LaneScaffold = DEFAULT_LANE_SCAFFOLD): Node[] {
  console.warn('snapToLanes is deprecated, use applyLaneScaffolding instead');
  return applyLaneScaffolding(nodes, scaffold);
}

/**
 * Position memoization to preserve layout between mode switches
 */
export class LayoutMemory {
  private positions: Map<string, { flow: { x: number; y: number }, board: { x: number; y: number } }> = new Map();
  
  savePositions(nodes: Node[], mode: 'flow' | 'board') {
    nodes.forEach(node => {
      const existing = this.positions.get(node.id) || { flow: { x: 0, y: 0 }, board: { x: 0, y: 0 } };
      existing[mode] = { x: node.position.x, y: node.position.y };
      this.positions.set(node.id, existing);
    });
  }
  
  restorePositions(nodes: Node[], mode: 'flow' | 'board'): Node[] {
    return nodes.map(node => {
      const saved = this.positions.get(node.id);
      if (saved) {
        return {
          ...node,
          position: saved[mode]
        };
      }
      return node;
    });
  }
  
  clear() {
    this.positions.clear();
  }
}