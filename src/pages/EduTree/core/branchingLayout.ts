/**
 * Enhanced layout engine for Y-shaped branching visualization
 * Provides proper positioning for foundation, branching, specialization, and convergence
 */

import { Node, Edge } from '@xyflow/react';
import { BRANCHING_STRUCTURE, BranchingNode } from './branchingData';

export interface LayoutOptions {
  nodeSpacing: {
    horizontal: number;
    vertical: number;
  };
  branchAngle: number;
  centerY: number;
}

const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  nodeSpacing: {
    horizontal: 320,
    vertical: 100
  },
  branchAngle: 30, // degrees for branch spread
  centerY: 200
};

/**
 * Apply branching-aware layout to nodes and edges
 */
export function applyBranchingLayout(
  nodes: Node[], 
  edges: Edge[], 
  options: Partial<LayoutOptions> = {}
): { nodes: Node[]; edges: Edge[] } {
  const opts = { ...DEFAULT_LAYOUT_OPTIONS, ...options };
  
  try {
    // Create positioning map from branching structure
    const positionMap = new Map<string, { x: number; y: number }>();
    
    BRANCHING_STRUCTURE.nodes.forEach((branchNode: BranchingNode) => {
      positionMap.set(branchNode.id, branchNode.position);
    });

    // Apply positions to React Flow nodes
    const layoutedNodes = nodes.map(node => {
      const position = positionMap.get(node.id);
      if (position) {
        return {
          ...node,
          position: { ...position }
        };
      }

      // Fallback positioning for nodes not in structure
      const level = Number(node.data?.level_year) || 0;
      const area = node.data?.area || 'unknown';
      
      // Enhanced fallback with better spacing
      let x = level * opts.nodeSpacing.horizontal;
      let y = opts.centerY;
      
      // Special handling for different areas
      if (area === 'general-education') {
        y = opts.centerY - 50; // Slightly above center
      } else if (area === 'mathematics') {
        y = opts.centerY + 50; // Slightly below center
      } else if (area === 'specialization') {
        // Spread specializations vertically
        const specializations = ['b301', 'b302', 'b331', 'b311', 'b321'];
        const index = specializations.indexOf(node.id);
        if (index >= 0) {
          y = opts.centerY + (index - 2) * 100; // Center around middle
        }
      }
      
      return {
        ...node,
        position: { x, y }
      };
    });

    return { nodes: layoutedNodes, edges };
  } catch (error) {
    console.warn('[BranchingLayout] Layout failed, using fallback:', error);
    
    // Fallback to grid layout
    const fallbackNodes = nodes.map((node, index) => ({
      ...node,
      position: {
        x: (index % 4) * opts.nodeSpacing.horizontal,
        y: Math.floor(index / 4) * opts.nodeSpacing.vertical
      }
    }));

    return { nodes: fallbackNodes, edges };
  }
}

/**
 * Calculate visual flow paths for edge routing
 */
export function calculateFlowPaths(
  sourceId: string, 
  targetId: string, 
  nodes: Node[]
): { waypoints: { x: number; y: number }[] } {
  const sourceNode = nodes.find(n => n.id === sourceId);
  const targetNode = nodes.find(n => n.id === targetId);
  
  if (!sourceNode || !targetNode) {
    return { waypoints: [] };
  }

  const source = sourceNode.position;
  const target = targetNode.position;
  
  // Check if this is a branching edge (from b202 to specializations)
  if (sourceId === 'b202' && ['b301', 'b302', 'b331'].includes(targetId)) {
    // Add curved waypoint for better visual flow
    const midX = source.x + (target.x - source.x) * 0.6;
    const midY = source.y + (target.y - source.y) * 0.3;
    
    return {
      waypoints: [
        { x: midX, y: midY }
      ]
    };
  }

  // Default: direct line
  return { waypoints: [] };
}

/**
 * Get visual hierarchy level for a node
 */
export function getNodeHierarchyLevel(nodeId: string): 'foundation' | 'branching' | 'specialization' | 'convergence' | 'unknown' {
  const branchNode = BRANCHING_STRUCTURE.nodes.find(n => n.id === nodeId);
  return branchNode?.area || 'unknown';
}

/**
 * Determine if two nodes are connected in the branching structure
 */
export function areNodesConnected(sourceId: string, targetId: string): boolean {
  return BRANCHING_STRUCTURE.edges.some(edge => 
    edge.sourceId === sourceId && edge.targetId === targetId
  );
}

/**
 * Get the visual styling class for a node based on its role in branching
 */
export function getNodeBranchingClass(nodeId: string, primaryTrack?: string, comparisonTrack?: string): string {
  const node = BRANCHING_STRUCTURE.nodes.find(n => n.id === nodeId);
  if (!node) return '';

  let classes: string[] = [];

  // Add area-based class
  classes.push(`node--${node.area}`);

  // Add sharing status
  if (node.isShared) {
    classes.push('node--shared');
  }

  // Add track membership classes if tracks are selected
  if (primaryTrack && node.tracks.includes(primaryTrack)) {
    classes.push('node--primary');
  }

  if (comparisonTrack && node.tracks.includes(comparisonTrack)) {
    classes.push('node--comparison');
  }

  // Special classes for key nodes
  if (nodeId === BRANCHING_STRUCTURE.branchingPoint) {
    classes.push('node--branching');
  }

  if (nodeId === BRANCHING_STRUCTURE.convergencePoint) {
    classes.push('node--convergence');
  }

  return classes.join(' ');
}

/**
 * Get the visual styling class for an edge based on its role in branching
 */
export function getEdgeBranchingClass(edgeId: string, primaryTrack?: string, comparisonTrack?: string): string {
  const edge = BRANCHING_STRUCTURE.edges.find(e => e.id === edgeId);
  if (!edge) return '';

  let classes: string[] = ['edge'];

  // Add sharing status
  if (edge.isShared) {
    classes.push('edge--shared');
  }

  // Add track membership classes if tracks are selected
  if (primaryTrack && edge.tracks.includes(primaryTrack)) {
    classes.push('edge--primary');
  }

  if (comparisonTrack && edge.tracks.includes(comparisonTrack)) {
    classes.push('edge--comparison');
  }

  // Both tracks use this edge
  if (primaryTrack && comparisonTrack && 
      edge.tracks.includes(primaryTrack) && 
      edge.tracks.includes(comparisonTrack)) {
    classes.push('edge--both');
  }

  return classes.join(' ');
}