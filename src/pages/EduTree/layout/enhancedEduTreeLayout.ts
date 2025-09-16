import { Node, Edge } from '@xyflow/react';
import { RequirementBlock } from '@/lib/types/eduTree';
import { TrackId, TRACK_DEFINITIONS } from '../data/trackDefinitions';

export interface LayoutNode {
  id: string;
  level: number;
  blockId: string;
  title: string;
  isTrackSpecific: boolean;
  tracks: TrackId[];
  isDecisionPoint: boolean;
  isDegreeNode: boolean;
  children: string[];
}

export interface LayoutConfig {
  baseColumnWidth: number;
  baseRowHeight: number;
  levelPadding: number;
  trackSeparation: number;
  decisionPointSpacing: number;
  enableSmartSpacing: boolean;
  enableTrackLanes: boolean;
}

const DEFAULT_CONFIG: LayoutConfig = {
  baseColumnWidth: 320,
  baseRowHeight: 100,
  levelPadding: 80,
  trackSeparation: 60,
  decisionPointSpacing: 40,
  enableSmartSpacing: true,
  enableTrackLanes: true
};

// Decision points where tracks diverge/merge
const DECISION_POINTS = new Set(['specializations', 'data-analysis']);
const SHARED_FOUNDATION = new Set(['foundations', 'mathematics', 'general-education', 'core-i', 'core-ii']);

/**
 * Enhanced layout algorithm that addresses:
 * 1. Level overcrowding through smart column width
 * 2. Edge crossings through track-aware positioning
 * 3. Visual hierarchy through decision point emphasis
 * 4. Track separation through visual lanes
 */
export function enhancedEduTreeLayout(
  nodes: Node[],
  edges: Edge[],
  primaryTrackId?: TrackId,
  config: Partial<LayoutConfig> = {}
): { nodes: Node[]; edges: Edge[] } {
  const layoutConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Build layout node structure
  const layoutNodes = buildLayoutNodes(nodes, edges);
  
  // Group nodes by level
  const nodesByLevel = groupNodesByLevel(layoutNodes);
  
  // Calculate smart column widths based on level density
  const columnWidths = calculateSmartColumnWidths(nodesByLevel, layoutConfig);
  
  // Position nodes using enhanced algorithm
  const positionedNodes = positionNodesWithTrackAwareness(
    nodes, 
    layoutNodes, 
    nodesByLevel, 
    columnWidths, 
    primaryTrackId,
    layoutConfig
  );
  
  // Generate enhanced edges with routing
  const enhancedEdges = enhanceEdgeRouting(edges, positionedNodes, layoutConfig);
  
  return {
    nodes: positionedNodes,
    edges: enhancedEdges
  };
}

function buildLayoutNodes(nodes: Node[], edges: Edge[]): Map<string, LayoutNode> {
  const layoutNodes = new Map<string, LayoutNode>();
  
  // Build adjacency list for children
  const childrenMap = new Map<string, string[]>();
  edges.forEach(edge => {
    if (!childrenMap.has(edge.source)) {
      childrenMap.set(edge.source, []);
    }
    childrenMap.get(edge.source)!.push(edge.target);
  });
  
  nodes.forEach(node => {
    const blockData = node.data?.block as any;
    if (!blockData) return;
    
    const slug = blockData.slug || blockData.id || node.id;
    const level = blockData.level_year || 0;
    
    // Determine which tracks this node belongs to
    const belongsToTracks: TrackId[] = [];
    TRACK_DEFINITIONS.forEach(track => {
      if (track.blockIds.includes(slug)) {
        belongsToTracks.push(track.id);
      }
    });
    
    const isTrackSpecific = belongsToTracks.length > 0 && belongsToTracks.length < TRACK_DEFINITIONS.length;
    const isDecisionPoint = DECISION_POINTS.has(slug);
    const isDegreeNode = node.type === 'terminalNode' || slug === 'degree-completion';
    
    layoutNodes.set(node.id, {
      id: node.id,
      level,
      blockId: slug,
      title: (blockData as any).title || 'Unknown',
      isTrackSpecific,
      tracks: belongsToTracks,
      isDecisionPoint,
      isDegreeNode,
      children: childrenMap.get(node.id) || []
    });
  });
  
  return layoutNodes;
}

function groupNodesByLevel(layoutNodes: Map<string, LayoutNode>): Map<number, LayoutNode[]> {
  const nodesByLevel = new Map<number, LayoutNode[]>();
  
  layoutNodes.forEach(node => {
    if (!nodesByLevel.has(node.level)) {
      nodesByLevel.set(node.level, []);
    }
    nodesByLevel.get(node.level)!.push(node);
  });
  
  // Sort nodes within each level for consistent ordering
  nodesByLevel.forEach(levelNodes => {
    levelNodes.sort((a, b) => {
      // Decision points first
      if (a.isDecisionPoint && !b.isDecisionPoint) return -1;
      if (!a.isDecisionPoint && b.isDecisionPoint) return 1;
      
      // Shared foundation next
      const aIsShared = SHARED_FOUNDATION.has(a.blockId);
      const bIsShared = SHARED_FOUNDATION.has(b.blockId);
      if (aIsShared && !bIsShared) return -1;
      if (!aIsShared && bIsShared) return 1;
      
      // Then by title
      return a.title.localeCompare(b.title);
    });
  });
  
  return nodesByLevel;
}

function calculateSmartColumnWidths(
  nodesByLevel: Map<number, LayoutNode[]>,
  config: LayoutConfig
): Map<number, number> {
  const columnWidths = new Map<number, number>();
  
  nodesByLevel.forEach((levelNodes, level) => {
    const nodeCount = levelNodes.length;
    
    // Base width adjusted for node density
    let width = config.baseColumnWidth;
    
    if (nodeCount > 3) {
      // Expand column for crowded levels
      width = config.baseColumnWidth * 1.4;
    } else if (nodeCount === 1) {
      // Compress column for single nodes
      width = config.baseColumnWidth * 0.8;
    }
    
    // Extra width for decision points
    const hasDecisionPoint = levelNodes.some(node => node.isDecisionPoint);
    if (hasDecisionPoint) {
      width += config.decisionPointSpacing;
    }
    
    columnWidths.set(level, width);
  });
  
  return columnWidths;
}

function positionNodesWithTrackAwareness(
  nodes: Node[],
  layoutNodes: Map<string, LayoutNode>,
  nodesByLevel: Map<number, LayoutNode[]>,
  columnWidths: Map<number, number>,
  primaryTrackId: TrackId | undefined,
  config: LayoutConfig
): Node[] {
  let cumulativeX = 0;
  const levelPositions = new Map<number, number>();
  
  // Calculate X positions for each level
  Array.from(nodesByLevel.keys()).sort((a, b) => a - b).forEach(level => {
    levelPositions.set(level, cumulativeX);
    cumulativeX += columnWidths.get(level) || config.baseColumnWidth;
  });
  
  return nodes.map(node => {
    const layoutNode = layoutNodes.get(node.id);
    if (!layoutNode) return node;
    
    const levelNodes = nodesByLevel.get(layoutNode.level) || [];
    const nodeIndex = levelNodes.findIndex(n => n.id === node.id);
    const baseX = levelPositions.get(layoutNode.level) || 0;
    
    // Calculate Y position with track-aware spacing
    let yOffset = 0;
    if (config.enableTrackLanes && layoutNode.isTrackSpecific) {
      // Group track-specific nodes with slight vertical offset
      const trackOffset = getTrackOffset(layoutNode.tracks, primaryTrackId);
      yOffset = trackOffset * config.trackSeparation;
    }
    
    // Special positioning for decision points
    if (layoutNode.isDecisionPoint) {
      yOffset -= config.decisionPointSpacing * 0.5; // Center decision points
    }
    
    const x = baseX;
    const y = nodeIndex * config.baseRowHeight + yOffset;
    
    return {
      ...node,
      position: { x, y },
      data: {
        ...node.data,
        layoutInfo: {
          level: layoutNode.level,
          isDecisionPoint: layoutNode.isDecisionPoint,
          isTrackSpecific: layoutNode.isTrackSpecific,
          tracks: layoutNode.tracks
        }
      }
    };
  });
}

function getTrackOffset(nodeTracks: TrackId[], primaryTrackId?: TrackId): number {
  if (!primaryTrackId || nodeTracks.length === 0) return 0;
  
  // Primary track nodes get slight upward offset
  if (nodeTracks.includes(primaryTrackId)) {
    return -0.3;
  }
  
  // Other track-specific nodes get slight downward offset
  return 0.3;
}

function enhanceEdgeRouting(
  edges: Edge[],
  nodes: Node[],
  config: LayoutConfig
): Edge[] {
  const nodePositions = new Map<string, { x: number; y: number }>();
  nodes.forEach(node => {
    nodePositions.set(node.id, node.position);
  });
  
  return edges.map(edge => {
    const sourcePos = nodePositions.get(edge.source);
    const targetPos = nodePositions.get(edge.target);
    
    if (!sourcePos || !targetPos) return edge;
    
    // Calculate if this edge needs special routing
    const horizontalDistance = Math.abs(targetPos.x - sourcePos.x);
    const verticalDistance = Math.abs(targetPos.y - sourcePos.y);
    
    let edgeType = 'smoothstep';
    let markerEnd = undefined;
    
    // Use bezier for long horizontal connections to reduce crossings
    if (horizontalDistance > config.baseColumnWidth * 1.5) {
      edgeType = 'bezier';
    }
    
    // Special styling for different edge types
    let className = edge.className || 'edge';
    
    // Mark edges that cross multiple levels as important
    if (horizontalDistance > config.baseColumnWidth * 2) {
      className += ' edge-long-span';
    }
    
    // Mark vertical edges differently
    if (verticalDistance > config.baseRowHeight * 2) {
      className += ' edge-vertical-span';
    }
    
    return {
      ...edge,
      type: edgeType,
      className,
      markerEnd,
      data: {
        ...edge.data,
        routingInfo: {
          horizontalDistance,
          verticalDistance,
          isLongSpan: horizontalDistance > config.baseColumnWidth * 2
        }
      }
    };
  });
}
