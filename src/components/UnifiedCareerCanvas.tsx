import React, { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Node,
  Edge,
  ConnectionMode,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { nodeTypes } from '@/components/nodes/UnifiedNodeTypes';
import { EnhancedNodeTooltip } from '@/components/EnhancedNodeTooltip';
import type { GraphNode, GraphEdge, NodeType } from '@/lib/careerGraph';
import { GraphLayoutEngine, type LayoutConfig } from '@/lib/graphLayout';
import { calculateEnhancedSkillTreeLayout, type LayoutNode, type LayoutEdge } from '@/lib/enhancedSkillTreeLayout';

// Extended edge interface to handle the transformed edges
interface ExtendedGraphEdge extends GraphEdge {
  source?: string;
  target?: string;
  type?: string;
}

interface UnifiedCareerCanvasProps {
  nodes: GraphNode[];
  edges: ExtendedGraphEdge[];
  onNodeClick?: (node: GraphNode) => void;
  showPivotPaths?: boolean;
  focusMode?: boolean;
  searchTerm?: string;
  selectedCareerPath?: string | null;
  layoutAlgorithm?: 'semantic-hierarchy' | 'category-cluster' | 'goal-focused' | 'progressive-disclosure';
  layoutConfig?: Partial<LayoutConfig>;
}

// Phase 1: Node type mapping with explicit constants
const NODE_TYPE_MAP = {
  skill: 'skill',
  job: 'job',
  course: 'course',
  step: 'step',
  project: 'project',
  certification: 'certification',
} as const;

const validateNodeType = (type: any): NodeType => {
  const validTypes = ['job', 'skill', 'step', 'course', 'project', 'certification', 'default'];
  return (type && validTypes.includes(type)) ? type : 'default';
};

// 🔧 STEP 4: Bulletproof grid fallback function (unified implementation)
function gridFallback(nodes: GraphNode[] | { id: string; title: string; type: string; data?: any }[]): Node[] {
  const COLS = 6, X0 = 60, Y0 = 60, DX = 220, DY = 160;
  console.log('📐 Using grid fallback for nodes:', nodes.length);
  
  return nodes.map((n, i) => ({
    id: n.id,
    type: validateNodeType(n.type),
    position: { x: X0 + (i % COLS) * DX, y: Y0 + Math.floor(i / COLS) * DY },
    data: {
      label: n.title,
      title: n.title,
      type: validateNodeType(n.type),
      node: n,
      "data-testid": "skill-node",
      "data-node-id": n.id,
      "data-node-type": validateNodeType(n.type),
    },
  }));
}

// Strongly Connected Components detection for cycle handling
const findSCCs = (nodes: GraphNode[], edges: ExtendedGraphEdge[]): GraphNode[][] => {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const adjacency = new Map<string, string[]>();
  
  // Build adjacency list
  nodes.forEach(n => adjacency.set(n.id, []));
  edges.forEach(e => {
    const source = String(e.source || e.from_id);
    const target = String(e.target || e.to_id);
    if (adjacency.has(source) && adjacency.has(target)) {
      adjacency.get(source)!.push(target);
    }
  });
  
  // Tarjan's algorithm for SCC detection
  const index = new Map<string, number>();
  const lowLink = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const sccs: string[][] = [];
  let indexCounter = 0;
  
  const strongConnect = (nodeId: string) => {
    index.set(nodeId, indexCounter);
    lowLink.set(nodeId, indexCounter);
    indexCounter++;
    stack.push(nodeId);
    onStack.add(nodeId);
    
    const neighbors = adjacency.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!index.has(neighbor)) {
        strongConnect(neighbor);
        lowLink.set(nodeId, Math.min(lowLink.get(nodeId)!, lowLink.get(neighbor)!));
      } else if (onStack.has(neighbor)) {
        lowLink.set(nodeId, Math.min(lowLink.get(nodeId)!, index.get(neighbor)!));
      }
    }
    
    if (lowLink.get(nodeId) === index.get(nodeId)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
      } while (w !== nodeId);
      sccs.push(scc);
    }
  };
  
  nodes.forEach(n => {
    if (!index.has(n.id)) {
      strongConnect(n.id);
    }
  });
  
  return sccs.map(scc => scc.map(id => nodeMap.get(id)!).filter(Boolean));
};

// Compact depth remapping to eliminate visual gaps
const compactDepths = (depthMap: Map<string, number>): Map<string, number> => {
  const uniqueDepths = Array.from(new Set(Array.from(depthMap.values()))).sort((a, b) => a - b);
  const remap = new Map<number, number>();
  uniqueDepths.forEach((depth, index) => remap.set(depth, index));
  
  const compactMap = new Map<string, number>();
  depthMap.forEach((depth, nodeId) => {
    compactMap.set(nodeId, remap.get(depth) ?? 0);
  });
  
  return compactMap;
};

// Calculate positions for SCC members in a circle
const placeMembersInCircle = (centerX: number, centerY: number, sccNodes: GraphNode[]): Map<string, { x: number; y: number }> => {
  const positions = new Map<string, { x: number; y: number }>();
  const radius = Math.max(60, Math.min(120, sccNodes.length * 25));
  
  sccNodes.forEach((node, index) => {
    const angle = (2 * Math.PI * index) / sccNodes.length;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    positions.set(node.id, { x, y });
  });
  
  return positions;
};

// Enhanced layout calculation with cycle handling and compact depths
const calculateLayout = (
  graphNodes: GraphNode[], 
  graphEdges: ExtendedGraphEdge[], 
  algorithm: 'semantic-hierarchy' | 'category-cluster' | 'goal-focused' | 'progressive-disclosure' = 'semantic-hierarchy',
  config?: Partial<LayoutConfig>,
  searchTerm?: string,
  selectedCareerPath?: string | null,
  showGoalPathOnly: boolean = false
): Node[] => {
  // Phase 1: No console.time to prevent re-entry issues
  console.log('🎨 Starting layout calculation without timers...');
  
  // Enhanced input sanitization
  const safeNodes = Array.isArray(graphNodes)
    ? graphNodes
        .map(n => ({
          ...n,
          id: String(n.id),
          type: validateNodeType(n.type),
          title: n.title || 'Untitled',
        }))
        .filter(n => n.id && n.type && n.title)
    : [];
    
  console.log('🔍 SafeNodes filter:', { 
    inputNodes: graphNodes?.length || 0, 
    outputNodes: safeNodes.length,
    sampleInput: graphNodes?.[0],
    sampleOutput: safeNodes[0]
  });

  // Simplified edge processing
  const safeEdges = Array.isArray(graphEdges) ? graphEdges
    .map(e => ({
      ...e,
      source: String(e.source || e.from_id || ''),
      target: String(e.target || e.to_id || ''),
    }))
    .filter(e => e.source && e.target) : [];

  // Prune edges to only include nodes that exist
  const nodeIdSet = new Set(safeNodes.map(n => n.id));
  const prunedEdges = safeEdges.filter(e => nodeIdSet.has(e.source) && nodeIdSet.has(e.target));

  console.log('🔗 Edge processing:', {
    totalEdges: graphEdges?.length || 0,
    safeEdges: safeEdges.length,
    prunedEdges: prunedEdges.length
  });

  if (safeNodes.length === 0) {
    console.warn('🪵 No valid nodes to render');
    return [];
  }

  try {
    // Check for force grid mode
    const FORCE_GRID = typeof window !== 'undefined' && 
      localStorage.getItem('ST_FORCE_GRID') === '1';
    
    if (FORCE_GRID) {
      console.log('📐 Force grid mode enabled');
      return gridFallback(safeNodes);
    }

    // Phase 3: Handle cycles with SCC detection
    const sccs = findSCCs(safeNodes, prunedEdges);
    const cyclicNodes = new Set<string>();
    const sccMap = new Map<string, GraphNode[]>();
    
    sccs.forEach(scc => {
      if (scc.length > 1) {
        scc.forEach(node => {
          cyclicNodes.add(node.id);
          sccMap.set(node.id, scc);
        });
      }
    });

    console.log('🔄 Cycle detection:', {
      totalSCCs: sccs.length,
      cyclicSCCs: sccs.filter(scc => scc.length > 1).length,
      cyclicNodes: cyclicNodes.size
    });

    // Calculate basic depths for DAG layout
    const depthMap = new Map<string, number>();
    const visited = new Set<string>();
    const visiting = new Set<string>();
    
    const calculateDepth = (nodeId: string): number => {
      if (visited.has(nodeId)) return depthMap.get(nodeId) || 0;
      if (visiting.has(nodeId)) return 0; // Cycle detected, use depth 0
      
      visiting.add(nodeId);
      let maxDepth = 0;
      
      // Find incoming edges (predecessors)
      const predecessors = prunedEdges
        .filter(e => e.target === nodeId)
        .map(e => e.source);
      
      for (const pred of predecessors) {
        if (!cyclicNodes.has(pred) || !cyclicNodes.has(nodeId)) {
          maxDepth = Math.max(maxDepth, calculateDepth(pred) + 1);
        }
      }
      
      visiting.delete(nodeId);
      visited.add(nodeId);
      depthMap.set(nodeId, maxDepth);
      return maxDepth;
    };
    
    safeNodes.forEach(node => {
      if (!visited.has(node.id)) {
        calculateDepth(node.id);
      }
    });

    // Phase 2: Compact depth bands
    const compactDepthMap = compactDepths(depthMap);
    
    console.log('📏 Depth analysis:', {
      originalDepths: Array.from(new Set(depthMap.values())).sort((a, b) => a - b),
      compactDepths: Array.from(new Set(compactDepthMap.values())).sort((a, b) => a - b),
      maxDepth: Math.max(...compactDepthMap.values())
    });

    // Phase 4: Identify orphans (nodes with no valid edges)
    const connectedNodes = new Set<string>();
    prunedEdges.forEach(e => {
      connectedNodes.add(e.source);
      connectedNodes.add(e.target);
    });
    
    const orphans = safeNodes.filter(n => !connectedNodes.has(n.id));
    const connected = safeNodes.filter(n => connectedNodes.has(n.id));
    
    console.log('🏝️ Orphan analysis:', {
      totalNodes: safeNodes.length,
      connectedNodes: connected.length,
      orphanNodes: orphans.length
    });

    // Layout configuration
    const BASE_X = 100;
    const BASE_Y = 100;
    const LAYER_X_GAP = 280;
    const LAYER_Y_GAP = 180;
    const ORPHAN_LANE_X = BASE_X - 260;
    
    const positions = new Map<string, { x: number; y: number }>();
    
    // Phase 4: Park orphans in dedicated lane
    orphans.forEach((node, index) => {
      positions.set(node.id, {
        x: ORPHAN_LANE_X,
        y: BASE_Y + index * 140
      });
    });
    
    // Layout connected nodes by depth with SCC handling
    const depthGroups = new Map<number, GraphNode[]>();
    connected.forEach(node => {
      const depth = compactDepthMap.get(node.id) || 0;
      if (!depthGroups.has(depth)) depthGroups.set(depth, []);
      depthGroups.get(depth)!.push(node);
    });
    
    // Position nodes by depth layer
    depthGroups.forEach((nodes, depth) => {
      const layerX = BASE_X + depth * LAYER_X_GAP;
      
      // Group by SCC for cyclic nodes
      const sccGroups = new Map<string, GraphNode[]>();
      const regularNodes: GraphNode[] = [];
      
      nodes.forEach(node => {
        if (cyclicNodes.has(node.id)) {
          const sccKey = sccMap.get(node.id)?.map(n => n.id).sort().join('|') || node.id;
          if (!sccGroups.has(sccKey)) sccGroups.set(sccKey, []);
          sccGroups.get(sccKey)!.push(node);
        } else {
          regularNodes.push(node);
        }
      });
      
      let yOffset = 0;
      
      // Position regular nodes
      regularNodes.forEach((node, index) => {
        positions.set(node.id, {
          x: layerX,
          y: BASE_Y + yOffset
        });
        yOffset += LAYER_Y_GAP;
      });
      
      // Position SCC groups in circles
      sccGroups.forEach(sccNodes => {
        if (sccNodes.length === 1) {
          positions.set(sccNodes[0].id, {
            x: layerX,
            y: BASE_Y + yOffset
          });
          yOffset += LAYER_Y_GAP;
        } else {
          // Place SCC in a circle
          const centerY = BASE_Y + yOffset + 100;
          const sccPositions = placeMembersInCircle(layerX, centerY, sccNodes);
          sccPositions.forEach((pos, nodeId) => {
            positions.set(nodeId, pos);
          });
          yOffset += 240; // Space for the circular SCC
        }
      });
    });

    console.log('✅ Enhanced layout with cycle handling successful:', positions.size, 'positioned nodes');

    // Convert to React Flow nodes with positions
    return safeNodes.map(originalNode => {
      const pos = positions.get(originalNode.id) || { x: 0, y: 0 };
      const isCheckpoint = originalNode.data && (originalNode.data as any).isCheckpoint;
      const isBranchPoint = originalNode.data && (originalNode.data as any).isBranchPoint;
      const pathType = originalNode.data && (originalNode.data as any).pathType;
      const isOrphan = orphans.includes(originalNode);
      const isInCycle = cyclicNodes.has(originalNode.id);
      
      return {
        id: originalNode.id,
        position: pos,
        data: {
          title: originalNode.title,
          description: originalNode.description,
          type: originalNode.type,
          node: originalNode,
          isCheckpoint,
          isBranchPoint,
          isOrphan,
          isInCycle,
          pathType,
          estimatedTime: originalNode.estimated_time_hours,
          'data-testid': 'skill-node',
          'data-node-type': originalNode.type,
          'data-node-id': originalNode.id,
        },
        type: validateNodeType(originalNode.type),
        style: {
          background: getNodeBackgroundColor(originalNode.type, pathType, isOrphan, isInCycle),
          border: `${isCheckpoint ? '4px' : isBranchPoint ? '3px' : '2px'} solid ${getNodeBorderColor(originalNode.type, isCheckpoint, isBranchPoint, isOrphan, isInCycle)}`,
          borderRadius: isCheckpoint ? '16px' : isBranchPoint ? '20px' : '12px',
          padding: '12px',
          fontSize: '11px',
          width: 180,
          height: 110,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          boxShadow: isCheckpoint 
            ? '0 4px 20px rgba(37, 99, 235, 0.3)' 
            : isBranchPoint 
            ? '0 3px 15px rgba(124, 58, 237, 0.25)'
            : isOrphan
            ? '0 2px 8px rgba(107, 114, 128, 0.2)'
            : isInCycle
            ? '0 3px 12px rgba(239, 68, 68, 0.2)'
            : '0 2px 8px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.2s ease-in-out',
          ...(isOrphan && {
            opacity: 0.7,
          }),
          ...(isInCycle && {
            background: `linear-gradient(135deg, ${getNodeBackgroundColor(originalNode.type, pathType)}, #fff1f2)`,
          })
        }
      };
    });

  } catch (error) {
    console.error('❌ Error in enhanced layout calculation:', error, {
      safeNodesCount: safeNodes.length,
      safeEdgesCount: safeEdges.length,
      algorithm
    });
    console.warn('🪜 Using grid fallback layout', { inputNodes: safeNodes.length });
    return gridFallback(safeNodes);
  }
};

// Helper function to extract category from node data
const extractCategoryFromNode = (node: GraphNode): string | undefined => {
  // Safely check for category in different node types
  if (node.data && 'category' in node.data) {
    return (node.data as any).category;
  }
  
  // Try to extract from title or description
  const text = (node.title + ' ' + (node.description || '')).toLowerCase();
  
  if (text.includes('javascript') || text.includes('react') || text.includes('programming')) {
    return 'Programming';
  } else if (text.includes('design') || text.includes('ui') || text.includes('ux')) {
    return 'Design';
  } else if (text.includes('backend') || text.includes('api') || text.includes('database')) {
    return 'Backend';
  } else if (text.includes('cloud') || text.includes('aws') || text.includes('devops')) {
    return 'Cloud';
  }
  
  return undefined;
};

// Helper function to extract level from node data
const extractLevelFromNode = (node: GraphNode): number | undefined => {
  // Safely check for level in different node types
  if (node.data && 'level' in node.data) {
    return (node.data as any).level;
  }
  
  if (node.data && 'difficulty_level' in node.data) {
    return (node.data as any).difficulty_level;
  }
  
  return undefined;
};

// Helper function to map edge types
const mapEdgeType = (edgeType: string): 'teaches' | 'requires' | 'qualifies_for' | 'supports' | 'prerequisite' => {
  const mapping: Record<string, any> = {
    'teaches': 'teaches',
    'requires': 'requires', 
    'qualifies_for': 'qualifies_for',
    'supports': 'supports',
    'prerequisite': 'prerequisite',
    'unlocks': 'teaches',
    'leads_to': 'supports',
    'demonstrates': 'supports',
    'validates': 'qualifies_for'
  };
  
  return mapping[edgeType] || 'supports';
};

// Convert GraphEdge to React Flow Edge with enhanced styling + Phase 2: String ID normalization
const convertToFlowEdge = (graphEdge: ExtendedGraphEdge): Edge => {
  // Phase 2: Guarantee string ID normalization
  const sourceId = String(graphEdge.source || graphEdge.from_id || '');
  const targetId = String(graphEdge.target || graphEdge.to_id || '');
  const edgeType = graphEdge.edge_type || graphEdge.type || 'connection';
  
  // DEBUG: Validate edge has required fields
  if (!sourceId || !targetId) {
    console.error('🚨 EDGE MISSING IDs:', {
      edgeId: graphEdge.id,
      sourceId,
      targetId,
      originalEdge: graphEdge
    });
  }
  
  const isTeachingEdge = edgeType === 'teaches' || edgeType === 'unlocks';
  const isRequirementEdge = edgeType === 'requires' || edgeType === 'prerequisite';
  
  // Phase 3: Clean production edge styling with proper animations
  const isImportantEdge = (graphEdge.importance_weight || 1) >= 2;
  const edge: Edge = {
    id: `${sourceId}-${targetId}`,
    source: sourceId,
    target: targetId,
    type: 'smoothstep',
    animated: edgeType === 'unlocks' || edgeType === 'teaches' || isImportantEdge,
    style: {
      stroke: getEdgeColor(edgeType),
      strokeWidth: getEdgeWidth(graphEdge.importance_weight || 1),
      opacity: 1,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: getEdgeColor(edgeType),
      width: 18,
      height: 18
    },
    label: edgeType.replace('_', ' '),
    labelStyle: {
      fontSize: '10px',
      fontWeight: '600',
      background: 'rgba(255, 255, 255, 0.9)',
      padding: '2px 6px',
      borderRadius: '4px',
    },
    data: {
      edgeType: edgeType,
      reasoning: graphEdge.reasoning,
      importance: graphEdge.importance_weight,
    }
  };
  
  return edge;
};

// Enhanced helper functions for styling with checkpoint, branch, orphan, and cycle support
const getNodeBorderColor = (
  nodeType: string, 
  isCheckpoint?: boolean, 
  isBranchPoint?: boolean,
  isOrphan?: boolean,
  isInCycle?: boolean
): string => {
  if (isCheckpoint) return '#2563eb'; // Primary blue
  if (isBranchPoint) return '#7c3aed'; // Purple accent
  if (isOrphan) return '#6b7280'; // Gray for orphans
  if (isInCycle) return '#ef4444'; // Red for cycles
  
  const colors = {
    skill: '#2563eb',     // Blue
    job: '#059669',       // Green
    course: '#7c3aed',    // Purple
    project: '#ea580c',   // Orange
    certification: '#dc2626', // Red
    step: '#0891b2'       // Cyan
  };
  return colors[nodeType as keyof typeof colors] || '#6b7280';
};

const getNodeBackgroundColor = (
  nodeType: string, 
  pathType?: string,
  isOrphan?: boolean,
  isInCycle?: boolean
): string => {
  // Special states override path type colors
  if (isOrphan) return '#f3f4f6'; // Light gray for orphans
  if (isInCycle) return '#fef2f2'; // Light red for cycles
  
  // Path type colors for differentiation
  if (pathType) {
    const pathColors = {
      fastest: '#fef3c7',      // Light yellow
      cheapest: '#d1fae5',     // Light green
      highest_roi: '#dbeafe',  // Light blue
      balanced: '#e5e7eb'      // Light gray
    };
    const pathColor = pathColors[pathType as keyof typeof pathColors];
    if (pathColor) return pathColor;
  }
  
  const colors = {
    skill: '#eff6ff',       // Very light blue
    job: '#ecfdf5',         // Very light green
    course: '#f3e8ff',      // Very light purple
    project: '#fff7ed',     // Very light orange
    certification: '#fef2f2', // Very light red
    step: '#ecfeff'         // Very light cyan
  };
  return colors[nodeType as keyof typeof colors] || '#ffffff';
};

const getEdgeColor = (edgeType: string): string => {
  const colors = {
    requires: '#6b7280',        // Gray
    unlocks: '#2563eb',         // Blue
    teaches: '#7c3aed',         // Purple
    demonstrates: '#0891b2',    // Cyan
    validates: '#059669',       // Green
    next_role: '#2563eb',       // Blue
    pivot: '#ea580c',           // Orange
    prerequisite: '#dc2626',    // Red
    substitution: '#4b5563',    // Dark gray
    leads_to: '#2563eb',        // Blue
    strengthens: '#7c3aed',     // Purple
    learning_progression: '#2563eb', // Blue
    branch_option: '#7c3aed'    // Purple
  };
  return colors[edgeType as keyof typeof colors] || '#6b7280';
};

const getEdgeWidth = (importance: number): number => {
  return Math.max(1, Math.min(4, importance * 2));
};

export const UnifiedCareerCanvas: React.FC<UnifiedCareerCanvasProps> = ({
  nodes: graphNodes,
  edges: graphEdges,
  onNodeClick,
  showPivotPaths = false,
  focusMode = false,
  searchTerm = '',
  selectedCareerPath,
  layoutAlgorithm = 'semantic-hierarchy',
  layoutConfig
}) => {
  const [tooltipNode, setTooltipNode] = useState<{ node: GraphNode; x: number; y: number } | null>(null);
  const reactFlowInstance = useReactFlow();
  
  // Phase 1: Data hash to prevent multiple layout calculations
  const dataHash = useMemo(() => {
    // Create a deterministic hash of the input data
    const nodeIds = graphNodes.map(n => n.id).slice(0, 10).join('|') + ':' + graphNodes.length;
    const edgeIds = graphEdges.map(e => e.id ?? `${e.source}-${e.target}`).slice(-10).join('|') + ':' + graphEdges.length;
    const configHash = `${layoutAlgorithm}:${searchTerm}:${selectedCareerPath}:${focusMode}`;
    
    const combined = nodeIds + '|' + edgeIds + '|' + configHash;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      hash = ((hash << 5) - hash) + combined.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }, [graphNodes, graphEdges, layoutAlgorithm, searchTerm, selectedCareerPath, focusMode]);

  const lastHashRef = React.useRef<number | null>(null);

  // Phase 5: Synchronous positioned nodes and edges calculation
  const { positionedNodes, validatedEdges } = useMemo(() => {
    console.log('🎨 Starting synchronized layout calculation...', { 
      nodeCount: graphNodes?.length,
      dataHash,
      lastHash: lastHashRef.current
    });
    
    // Phase 1: Guard against redundant calculations
    if (lastHashRef.current === dataHash) {
      console.log('🔄 Data hash unchanged, skipping layout recalculation');
      return { positionedNodes: [], validatedEdges: [] };
    }
    
    // ✅ FORCE TEST MODE - shows single test node if ST_FORCE_TEST=1
    const FORCE_TEST = typeof window !== 'undefined' && localStorage.getItem('ST_FORCE_TEST') === '1';
    if (FORCE_TEST) {
      const forceNodes = [{ 
        id: 'test-node', 
        type: 'default',
        position: { x: 200, y: 200 }, 
        data: { 
          title: '🧪 Debug Test Node',
          label: '🧪 Debug Test Node',
          'data-testid': 'skill-node',
          'data-node-type': 'default',
          'data-node-id': 'test-node'
        },
        style: {
          background: '#fef3c7',
          border: '2px solid #f59e0b',
          borderRadius: '8px',
          padding: '10px',
          width: 140,
          height: 60
        }
      }];
      console.log('🧪 FORCE_TEST enabled - rendering test node');
      return { positionedNodes: forceNodes, validatedEdges: [] };
    }

    // Early return for empty data
    if (!Array.isArray(graphNodes) || graphNodes.length === 0) {
      console.log('📝 No nodes to render');
      return { positionedNodes: [], validatedEdges: [] };
    }
    
    // 🧪 STEP 3A: Robust Input Sanitization
    const safeNodes = graphNodes
      .map(n => ({
        ...n,
        id: String(n.id),
        type: (n.type && ['job', 'skill', 'step', 'course', 'project', 'certification'].includes(n.type)) ? n.type : 'skill' as NodeType,
        title: n.title || (n as any)?.data?.title || 'Untitled',
      }))
      .filter(n => n.id && n.type && n.title);
    
    console.log('🧪 Input validation:', {
      inputNodes: graphNodes.length,
      safeNodes: safeNodes.length,
      sampleNode: safeNodes[0]
    });

    // Early return for empty data after filtering
    if (safeNodes.length === 0) {
      console.warn('🪵 No valid nodes after filtering');
      return { positionedNodes: [], validatedEdges: [] };
    }

    // 🔧 Phase 1 Fix: Force grid layout for stability
    const FORCE_GRID = typeof window !== 'undefined' && 
      (localStorage.getItem('ST_FORCE_GRID') === '1' || 
       localStorage.getItem('ST_STABILITY_MODE') === '1');
    
    if (FORCE_GRID) {
      console.log('📐 Stability mode: using grid layout');
      const gridNodes = gridFallback(safeNodes);
      return { positionedNodes: gridNodes, validatedEdges: [] };
    }

    // Try enhanced layout with fallback
    let layoutNodes: Node[] = [];
    try {
      const result = calculateLayout(
        safeNodes,
        graphEdges || [],
        layoutAlgorithm,
        layoutConfig,
        searchTerm,
        selectedCareerPath,
        focusMode
      );
      
      // Validate result
      if (!Array.isArray(result) || result.length === 0) {
        console.warn('📐 Layout returned empty, using grid fallback');
        layoutNodes = gridFallback(safeNodes);
      } else {
        console.log('✅ Enhanced layout successful:', result.length, 'nodes');
        layoutNodes = result;
      }
    } catch (error) {
      console.error('❌ Enhanced layout failed, using grid fallback:', error);
      layoutNodes = gridFallback(safeNodes);
    }

    // Process edges with validation
    console.log('🔗 EDGE CONVERSION DEBUG:', {
      rawGraphEdgesCount: graphEdges.length,
      rawGraphEdgesSample: graphEdges.slice(0, 2),
    });
    
    let processedEdges = graphEdges.map(convertToFlowEdge);
    
    // Phase 4: Enhanced validation with sanity checks
    const nodeIds = new Set(layoutNodes.map(n => n.id));
    const uniqueNodeIds = new Set(layoutNodes.map(n => n.id));
    
    // Sanity check: Ensure all node IDs are unique
    if (uniqueNodeIds.size !== layoutNodes.length) {
      console.warn('🚨 DUPLICATE NODE IDs DETECTED:', {
        totalNodes: layoutNodes.length,
        uniqueIds: uniqueNodeIds.size
      });
    }
    
    // Validate edge-node alignment
    const edgeValidation = processedEdges.map(edge => ({
      edgeId: edge.id,
      hasValidSource: nodeIds.has(edge.source),
      hasValidTarget: nodeIds.has(edge.target),
      source: edge.source,
      target: edge.target
    }));
    
    const invalidEdges = edgeValidation.filter(e => !e.hasValidSource || !e.hasValidTarget);
    if (invalidEdges.length > 0) {
      console.error('🚨 INVALID EDGES FOUND:', {
        invalidEdges,
        availableNodeIds: Array.from(nodeIds),
        totalEdges: processedEdges.length
      });
      
      // Filter out invalid edges
      processedEdges = processedEdges.filter(edge => 
        nodeIds.has(edge.source) && nodeIds.has(edge.target)
      );
    }
    
    console.log('🔗 EDGE CONVERSION RESULT:', {
      convertedEdgesCount: processedEdges.length,
      validEdges: processedEdges.length,
      invalidEdges: invalidEdges.length,
      nodeCount: nodeIds.size,
      nodeTypeDistribution: layoutNodes.reduce((acc, node) => {
        acc[node.type || 'unknown'] = (acc[node.type || 'unknown'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    });
    
    return { positionedNodes: layoutNodes, validatedEdges: processedEdges };
  }, [dataHash, graphNodes, graphEdges, layoutAlgorithm, layoutConfig, searchTerm, selectedCareerPath, focusMode]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const fittedRef = React.useRef(false);

  // Phase 5: Synchronous state population - set both nodes and edges atomically
  React.useEffect(() => {
    if (lastHashRef.current === dataHash) return; // Guard against redundant updates
    
    lastHashRef.current = dataHash;
    
    if (positionedNodes.length > 0) {
      console.log('📍 Setting positioned nodes and edges synchronously:', {
        nodes: positionedNodes.length,
        edges: validatedEdges.length
      });
      
      setNodes(positionedNodes);
      setEdges(validatedEdges);
      fittedRef.current = false; // Reset fit flag when data changes
    }
  }, [dataHash, positionedNodes, validatedEdges, setNodes, setEdges]);

  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    // Use simple node ID to find the graph node
    const graphNode = graphNodes.find(gn => gn.id === node.id);
    if (graphNode && onNodeClick) {
      onNodeClick(graphNode);
    }
  }, [graphNodes, onNodeClick]);

  const handleNodeMouseEnter = useCallback((event: React.MouseEvent, node: Node) => {
    const graphNode = graphNodes.find(gn => gn.id === node.id);
    if (graphNode) {
      setTooltipNode({
        node: graphNode,
        x: event.clientX,
        y: event.clientY
      });
    }
  }, [graphNodes]);

  const handleNodeMouseLeave = useCallback(() => {
    setTooltipNode(null);
  }, []);

  // Filter and highlight based on search
  const processedNodes = useMemo(() => {
    return nodes.map(node => {
      const nodeTitle = typeof node.data?.title === 'string' ? node.data.title : '';
      const nodeDescription = typeof node.data?.description === 'string' ? node.data.description : '';
      
      const isHighlighted = searchTerm && 
        (nodeTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
         nodeDescription.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return {
        ...node,
        style: {
          ...node.style,
          opacity: searchTerm && !isHighlighted ? 0.3 : 1,
          transform: isHighlighted ? 'scale(1.05)' : 'scale(1)'
        }
      };
    });
  }, [nodes, searchTerm]);

  // Phase 1: Single fitView with proper guard
  React.useEffect(() => {
    if (!reactFlowInstance || fittedRef.current || nodes.length === 0) return;

    const timeoutId = setTimeout(() => {
      try {
        reactFlowInstance.fitView({ 
          padding: 0.2, 
          includeHiddenNodes: false, 
          duration: 300,
          minZoom: 0.1,
          maxZoom: 1.25
        });
        fittedRef.current = true; // Prevent multiple fitView calls
        console.log('🎯 Single fitView completed for', nodes.length, 'nodes');
      } catch (error) {
        console.warn('FitView failed:', error);
      }
    }, 60);

    return () => clearTimeout(timeoutId);
  }, [nodes.length, reactFlowInstance]);

  console.log('🎨 UnifiedCareerCanvas render:', {
    graphNodesCount: graphNodes.length,
    flowNodesCount: nodes.length,
    edgesCount: edges.length,
    layoutAlgorithm,
    showPivotPaths,
    focusMode,
    finalRFNodes: processedNodes.length,
    searchTerm,
    dataHash,
    hashChanged: lastHashRef.current !== dataHash
  });

  // Phase 4: Default edge options for consistent styling
  const defaultEdgeOptions = {
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
    style: { strokeWidth: 2, opacity: 1 },
  };

  return (
    <div className="w-full h-full min-h-[400px]">
      <ReactFlow
        nodes={processedNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeMouseEnter={handleNodeMouseEnter}
        onNodeMouseLeave={handleNodeMouseLeave}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionMode={ConnectionMode.Loose}
        connectionLineStyle={{ strokeWidth: 2 }}
        attributionPosition="bottom-left"
        className="unified-career-canvas"
        style={{ width: '100%', height: '100%' }}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
        <MiniMap 
          zoomable 
          pannable 
          nodeStrokeWidth={3}
          nodeColor={(node) => {
            const nodeType = node.type || 'default';
            return getNodeBorderColor(nodeType);
          }}
        />
      </ReactFlow>
      
      {/* Enhanced tooltip */}
      {tooltipNode && (
        <EnhancedNodeTooltip
          node={tooltipNode.node}
          x={tooltipNode.x}
          y={tooltipNode.y}
          visible={!!tooltipNode}
        />
      )}
      
      {/* Enhanced overlay with detailed graph stats */}
      <div className="absolute top-4 left-4 bg-background/95 backdrop-blur-sm border rounded-lg p-4 text-sm shadow-lg">
        <div className="font-semibold mb-3 text-primary">Enhanced Career Graph</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            Skills: <span className="font-medium">{graphNodes.filter(n => n.type === 'skill').length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            Jobs: <span className="font-medium">{graphNodes.filter(n => n.type === 'job').length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            Courses: <span className="font-medium">{graphNodes.filter(n => n.type === 'course').length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            Projects: <span className="font-medium">{graphNodes.filter(n => n.type === 'project').length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            Certs: <span className="font-medium">{graphNodes.filter(n => n.type === 'certification').length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
            Steps: <span className="font-medium">{graphNodes.filter(n => n.type === 'step').length}</span>
          </div>
        </div>
        <div className="mt-3 pt-2 border-t text-xs text-muted-foreground">
          <div>Total: <span className="font-medium">{graphNodes.length} nodes</span></div>
          <div>Connections: <span className="font-medium">{graphEdges.length}</span></div>
          <div>Layout: <span className="font-medium">{layoutAlgorithm}</span></div>
          <div>Hash: <span className="font-mono text-xs">{dataHash}</span></div>
        </div>
        {searchTerm && (
          <div className="mt-2 pt-2 border-t text-xs">
            <div className="flex items-center gap-2 text-blue-600">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              Search: "{searchTerm}"
            </div>
          </div>
        )}
        {showPivotPaths && (
          <div className="mt-1 text-xs text-orange-600 font-medium">
            🔄 Pivot Analysis Active
          </div>
        )}
      </div>
    </div>
  );
};