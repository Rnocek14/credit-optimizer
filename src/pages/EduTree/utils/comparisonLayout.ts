import type { Node } from '@xyflow/react';
import type { TrackHighlights } from '../hooks/useTrackComparison';

export interface ComparisonLayoutConfig {
  // Shared foundation area
  sharedX: number;
  sharedStartY: number;
  sharedSpacing: number;
  
  // Divergence point
  divergenceX: number;
  divergenceY: number;
  
  // Specialized tracks area
  specializedX: number;
  trackSeparation: number; // vertical separation between tracks
  trackSpacing: number; // spacing within a track
}

const DEFAULT_CONFIG: ComparisonLayoutConfig = {
  sharedX: 750,
  sharedStartY: -200,
  sharedSpacing: 200,
  
  divergenceX: 1500,
  divergenceY: 600,
  
  specializedX: 2500,
  trackSeparation: 800,
  trackSpacing: 300
};

export function applyComparisonLayout(
  nodes: Node[],
  highlights: TrackHighlights,
  config: ComparisonLayoutConfig = DEFAULT_CONFIG
): Node[] {
  
  // Create position maps for each category
  const positionedNodes: Node[] = [];
  const processedIds = new Set<string>();
  
  // 1. Position shared nodes (foundation) on the left
  const sharedNodes = nodes.filter(node => highlights.sharedNodes.has(node.id));
  sharedNodes.forEach((node, index) => {
    positionedNodes.push({
      ...node,
      position: {
        x: config.sharedX,
        y: config.sharedStartY + (index * config.sharedSpacing)
      },
      data: {
        ...node.data,
        hasComparisonLayout: true
      }
    });
    processedIds.add(node.id);
  });
  
  // 2. Position primary track specialized nodes (top right)
  const primaryOnlyNodes = nodes.filter(node => 
    highlights.primaryNodes.has(node.id) && !highlights.sharedNodes.has(node.id)
  );
  primaryOnlyNodes.forEach((node, index) => {
    positionedNodes.push({
      ...node,
      position: {
        x: config.specializedX + (index * 200), // spread horizontally
        y: config.divergenceY - config.trackSeparation/2 - (index * config.trackSpacing)
      },
      data: {
        ...node.data,
        hasComparisonLayout: true
      }
    });
    processedIds.add(node.id);
  });
  
  // 3. Position comparison track specialized nodes (bottom right)
  const comparisonOnlyNodes = nodes.filter(node => 
    highlights.comparisonNodes.has(node.id) && !highlights.sharedNodes.has(node.id)
  );
  comparisonOnlyNodes.forEach((node, index) => {
    positionedNodes.push({
      ...node,
      position: {
        x: config.specializedX + (index * 200), // spread horizontally
        y: config.divergenceY + config.trackSeparation/2 + (index * config.trackSpacing)
      },
      data: {
        ...node.data,
        hasComparisonLayout: true
      }
    });
    processedIds.add(node.id);
  });
  
  // 4. Create/position divergence gate node
  const divergenceNode = nodes.find(node => 
    node.id === 'divergence-gate' || 
    node.data?.blockSlug === 'divergence-gate' ||
    node.data?.type === 'divergence'
  );
  
  if (divergenceNode) {
    positionedNodes.push({
      ...divergenceNode,
      position: {
        x: config.divergenceX,
        y: config.divergenceY
      },
      data: {
        ...divergenceNode.data,
        hasComparisonLayout: true,
        isDivergencePoint: true
      }
    });
    processedIds.add(divergenceNode.id);
  }
  
  // 5. Position any remaining nodes (dimmed, out of the way)
  const remainingNodes = nodes.filter(node => !processedIds.has(node.id));
  remainingNodes.forEach((node, index) => {
    positionedNodes.push({
      ...node,
      position: {
        x: 100,
        y: index * 100
      },
      data: {
        ...node.data,
        hasComparisonLayout: true
      }
    });
  });
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[ComparisonLayout] Positioned nodes:', {
      shared: sharedNodes.length,
      primaryOnly: primaryOnlyNodes.length,
      comparisonOnly: comparisonOnlyNodes.length,
      divergence: divergenceNode ? 1 : 0,
      remaining: remainingNodes.length,
      total: positionedNodes.length
    });
  }
  
  return positionedNodes;
}

export function isComparisonLayoutActive(
  primaryTrackId?: string,
  comparisonTrackId?: string,
  overlayEnabled?: boolean
): boolean {
  return !!(overlayEnabled && primaryTrackId && comparisonTrackId);
}