// Enhanced layout algorithm for EduTree with better visual clarity and track separation
import { Node, Edge } from '@xyflow/react';

interface LayoutNode extends Node {
  level: number;
  trackAffinity?: string;
  isDecisionPoint?: boolean;
  trackSpecific?: boolean;
  isCoreBlock?: boolean;
  isTerminal?: boolean;
}

interface LayoutConfig {
  levelSpacing: number;
  nodeSpacing: number;
  trackLaneSpacing: number;
  baseNodeWidth: number;
  baseNodeHeight: number;
  terminalNodeOffset: number;
  decisionPointSpacing: number;
}

const DEFAULT_CONFIG: LayoutConfig = {
  levelSpacing: 280,
  nodeSpacing: 120,
  trackLaneSpacing: 150,
  baseNodeWidth: 200,
  baseNodeHeight: 80,
  terminalNodeOffset: 100,
  decisionPointSpacing: 60
};

// Track definitions for visual separation
const TRACK_DEFINITIONS = {
  'data-science': {
    color: '#2563EB',
    lane: -1,
    blocks: ['data-analysis', 'machine-learning', 'capstone-data-science']
  },
  'software-engineering': {
    color: '#059669',
    lane: 1,
    blocks: ['specializations', 'architecture', 'capstone-software-engineering']
  },
  'core': {
    color: '#4F46E5',
    lane: 0,
    blocks: ['foundations', 'general-education', 'mathematics', 'core-i', 'core-ii']
  },
  'terminal': {
    color: '#D97706',
    lane: 0,
    blocks: ['degree-completion']
  }
};

export const enhancedEduTreeLayout = (
  nodes: Node[],
  edges: Edge[],
  primaryTrack?: string,
  config: Partial<LayoutConfig> = {}
): { nodes: Node[]; edges: Edge[] } => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Build layout nodes with enhanced metadata and track assignment
  const layoutNodes = buildLayoutNodes(nodes, edges);
  
  // Group nodes by level for positioning
  const nodesByLevel = groupNodesByLevel(layoutNodes);
  
  // Calculate smart positioning with track lanes
  const positionedNodes = positionNodesWithTrackLanes(
    nodesByLevel,
    finalConfig
  );
  
  // Enhance edge routing with track-aware styling
  const enhancedEdges = enhanceEdgeRoutingWithTracks(edges, positionedNodes);
  
  return {
    nodes: positionedNodes,
    edges: enhancedEdges
  };
};

// Helper functions for enhanced layout
function buildLayoutNodes(nodes: Node[], edges: Edge[]): LayoutNode[] {
  return nodes.map(node => {
    const blockData = node.data?.block as any;
    const slug = blockData?.slug || '';
    
    // Determine track affinity and characteristics
    const trackInfo = getTrackInfo(slug);
    const isDecisionPoint = ['core-ii'].includes(slug);
    const isCoreBlock = TRACK_DEFINITIONS.core.blocks.includes(slug);
    const isTerminal = slug === 'degree-completion';
    
    return {
      ...node,
      level: blockData?.level_year || 1,
      trackAffinity: trackInfo.track,
      isDecisionPoint,
      trackSpecific: !isCoreBlock && !isTerminal,
      isCoreBlock,
      isTerminal
    };
  });
}

function getTrackInfo(slug: string): { track: string; lane: number; color: string } {
  for (const [trackName, trackData] of Object.entries(TRACK_DEFINITIONS)) {
    if (trackData.blocks.includes(slug)) {
      return {
        track: trackName,
        lane: trackData.lane,
        color: trackData.color
      };
    }
  }
  return { track: 'core', lane: 0, color: TRACK_DEFINITIONS.core.color };
}

function groupNodesByLevel(nodes: LayoutNode[]): Map<number, LayoutNode[]> {
  const grouped = new Map<number, LayoutNode[]>();
  
  nodes.forEach(node => {
    const level = node.level;
    if (!grouped.has(level)) {
      grouped.set(level, []);
    }
    grouped.get(level)!.push(node);
  });
  
  // Sort nodes within each level for optimal visual flow
  grouped.forEach(levelNodes => {
    levelNodes.sort((a, b) => {
      // Core blocks go in center
      if (a.isCoreBlock && !b.isCoreBlock) return 0;
      if (!a.isCoreBlock && b.isCoreBlock) return 0;
      
      // Terminal nodes go to center
      if (a.isTerminal) return 0;
      if (b.isTerminal) return 0;
      
      // Sort by track lane (data science left, software engineering right)
      const aSlug = (a.data as any)?.block?.slug || '';
      const bSlug = (b.data as any)?.block?.slug || '';
      const aLane = getTrackInfo(aSlug).lane;
      const bLane = getTrackInfo(bSlug).lane;
      return aLane - bLane;
    });
  });
  
  return grouped;
}

function positionNodesWithTrackLanes(
  nodesByLevel: Map<number, LayoutNode[]>,
  config: LayoutConfig
): Node[] {
  const positionedNodes: Node[] = [];
  let currentX = 100; // Start with some padding
  
  // Sort levels for proper left-to-right progression
  const sortedLevels = Array.from(nodesByLevel.keys()).sort((a, b) => a - b);
  
  sortedLevels.forEach(level => {
    const levelNodes = nodesByLevel.get(level) || [];
    
    // Group nodes by track lane for this level
    const nodesByLane = new Map<number, LayoutNode[]>();
    levelNodes.forEach(node => {
      const blockSlug = (node.data as any)?.block?.slug || '';
      const lane = getTrackInfo(blockSlug).lane;
      if (!nodesByLane.has(lane)) {
        nodesByLane.set(lane, []);
      }
      nodesByLane.get(lane)!.push(node);
    });
    
    // Position nodes in their respective lanes
    nodesByLane.forEach((laneNodes, lane) => {
      const laneY = lane * config.trackLaneSpacing; // Vertical separation by track
      let laneNodeY = laneY - ((laneNodes.length - 1) * config.nodeSpacing) / 2;
      
      laneNodes.forEach(node => {
        let finalX = currentX;
        let finalY = laneNodeY;
        
        // Special positioning for terminal node (degree completion)
        if (node.isTerminal) {
          finalX += config.terminalNodeOffset;
          finalY = 0; // Center terminal node
        }
        
        // Special positioning for decision points
        if (node.isDecisionPoint) {
          finalY = 0; // Center decision points
        }
        
        const blockSlug = (node.data as any)?.block?.slug || '';
        const positionedNode: Node = {
          ...node,
          position: { x: finalX, y: finalY },
          // Add track-specific data for styling
          data: {
            ...node.data,
            trackInfo: getTrackInfo(blockSlug)
          }
        };
        
        positionedNodes.push(positionedNode);
        laneNodeY += config.nodeSpacing;
      });
    });
    
    currentX += config.levelSpacing;
  });
  
  return positionedNodes;
}

function enhanceEdgeRoutingWithTracks(edges: Edge[], nodes: Node[]): Edge[] {
  return edges.map(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) return edge;
    
    const sourceTrackInfo = (sourceNode.data as any)?.trackInfo || getTrackInfo('');
    const targetTrackInfo = (targetNode.data as any)?.trackInfo || getTrackInfo('');
    
    const distance = Math.abs(targetNode.position.x - sourceNode.position.x);
    const verticalDistance = Math.abs(targetNode.position.y - sourceNode.position.y);
    const isCrossTrack = sourceTrackInfo.track !== targetTrackInfo.track;
    const isToCapstone = (targetNode.data as any)?.block?.slug?.includes('capstone');
    const isFromDecisionPoint = (sourceNode as LayoutNode).isDecisionPoint;
    
    let edgeStyle: React.CSSProperties = {
      strokeWidth: 2,
      stroke: sourceTrackInfo.color
    };
    
    let edgeType = 'smoothstep';
    const classes = ['edge-enhanced'];
    
    if (isCrossTrack && isFromDecisionPoint) {
      classes.push('edge-decision-branch');
      edgeStyle.strokeDasharray = '6,3';
      edgeStyle.strokeWidth = 3;
      edgeStyle.stroke = targetTrackInfo.color;
    }
    
    if ((targetNode.data as any)?.block?.slug === 'degree-completion') {
      classes.push('edge-terminal');
      edgeType = 'bezier';
      edgeStyle.strokeWidth = 4;
      edgeStyle.stroke = TRACK_DEFINITIONS.terminal.color;
    }
    
    if (isToCapstone) {
      classes.push('edge-capstone');
      edgeStyle.strokeWidth = 3;
      edgeStyle.stroke = targetTrackInfo.color;
    }
    
    if (verticalDistance > 100) {
      classes.push('edge-long-vertical');
    }
    
    return {
      ...edge,
      type: edgeType,
      style: edgeStyle,
      className: classes.join(' '),
      animated: isFromDecisionPoint && isCrossTrack
    };
  });
}
