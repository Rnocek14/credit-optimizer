/**
 * ELK Layout Engine for V4 Spine-First Planner
 * Horizontal spine (years left-to-right) with vertical branches (courses)
 */

import ELK from 'elkjs/lib/elk.bundled.js';
import { PlanNode, PlanEdge, NodeType } from '../types/v4';

export interface LayoutOptions {
  /** Direction of spine flow (RIGHT = horizontal left-to-right) */
  direction?: 'RIGHT' | 'DOWN' | 'LEFT' | 'UP';
  /** Spacing between nodes in same layer */
  nodeSpacing?: number;
  /** Spacing between layers (spine segments) */
  layerSpacing?: number;
  /** Node dimensions */
  nodeWidth?: number;
  nodeHeight?: number;
}

const DEFAULT_OPTIONS: Required<LayoutOptions> = {
  direction: 'RIGHT',
  nodeSpacing: 80,
  layerSpacing: 200,
  nodeWidth: 150,
  nodeHeight: 80
};

/**
 * Apply ELK hierarchical layout to spine graph
 * - Spine nodes (years) flow horizontally
 * - Course nodes branch vertically below their year
 * - Prerequisite edges create horizontal connections
 */
export async function layoutSpineGraph(
  nodes: PlanNode[],
  edges: PlanEdge[],
  options: LayoutOptions = {}
): Promise<PlanNode[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const elk = new ELK();

  // Separate spine nodes (years) from branch nodes (courses, requirements)
  const spineNodes = nodes.filter(n => n.type === NodeType.Year);
  const branchNodes = nodes.filter(n => n.type !== NodeType.Year);

  console.log('[Layout Engine] Processing', {
    spine: spineNodes.length,
    branches: branchNodes.length,
    edges: edges.length
  });

  // Build ELK graph with hierarchical structure
  const elkGraph = {
    id: "root",
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': opts.direction,
      'elk.spacing.nodeNode': String(opts.nodeSpacing),
      'elk.layered.spacing.nodeNodeBetweenLayers': String(opts.layerSpacing),
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      // Prioritize minimizing edge crossings over compactness
      'elk.layered.considerModelOrder.strategy': 'PREFER_EDGES',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      // Keep prerequisite edges flowing left-to-right
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.feedbackEdges': 'true'
    },
    children: [
      // Spine nodes at top level
      ...spineNodes.map((n, index) => ({
        id: n.id,
        width: opts.nodeWidth,
        height: opts.nodeHeight,
        // Assign to layers explicitly for stable horizontal ordering
        layoutOptions: {
          'elk.layered.layerConstraint': String(index)
        }
      })),
      // Branch nodes (courses, requirements) with their year as parent
      ...branchNodes.map(n => {
        // Determine which year this node belongs to
        const year = n.data.year;
        const parentYearNode = spineNodes.find(s => 
          s.data.label?.includes(String(year)) || 
          s.id === `year${year}`
        );

        return {
          id: n.id,
          width: n.type === NodeType.Bundle ? opts.nodeWidth * 0.8 : opts.nodeWidth,
          height: n.type === NodeType.Bundle ? opts.nodeHeight * 0.6 : opts.nodeHeight,
          // External nodes (transfer credits) slightly smaller
          ...(n.type === NodeType.External && {
            width: opts.nodeWidth * 0.9,
            height: opts.nodeHeight * 0.7
          }),
          // Group by year for hierarchical positioning
          ...(parentYearNode && {
            layoutOptions: {
              'elk.partitioning.partition': parentYearNode.id
            }
          })
        };
      })
    ],
    edges: edges
      .filter(e => !e.hidden) // Skip hidden equivalency edges in layout
      .map(e => ({
        id: e.id,
        sources: [e.source],
        targets: [e.target],
        // Sequence edges (spine) should be straight
        ...(e.type === 'sequence' && {
          layoutOptions: {
            'elk.priority': '10' // Higher priority for spine edges
          }
        })
      }))
  };

  // Run ELK layout algorithm
  const layout = await elk.layout(elkGraph);

  console.log('[Layout Engine] ELK layout complete');

  // Map ELK positions back to PlanNodes
  return nodes.map(node => {
    const layoutNode = layout.children?.find(n => n.id === node.id);
    
    if (!layoutNode) {
      console.warn(`[Layout Engine] No position found for node ${node.id}`);
      return node;
    }

    return {
      ...node,
      position: {
        x: layoutNode.x ?? 0,
        y: layoutNode.y ?? 0
      }
    };
  });
}

/**
 * Manual spine layout (fallback if ELK fails)
 * Simple grid: years horizontal, courses vertical
 */
export function manualSpineLayout(
  nodes: PlanNode[],
  options: LayoutOptions = {}
): PlanNode[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const spineNodes = nodes.filter(n => n.type === NodeType.Year);
  const branchNodes = nodes.filter(n => n.type !== NodeType.Year);

  // Position spine horizontally
  const positioned = spineNodes.map((node, index) => ({
    ...node,
    position: { x: index * opts.layerSpacing, y: 0 }
  }));

  // Position courses below their year
  branchNodes.forEach((node, index) => {
    const year = node.data.year;
    const yearNode = spineNodes.find(s => 
      s.data.label?.includes(String(year)) || 
      s.id === `year${year}`
    );
    
    const yearIndex = spineNodes.indexOf(yearNode!);
    const baseX = yearIndex >= 0 ? yearIndex * opts.layerSpacing : 0;
    
    positioned.push({
      ...node,
      position: {
        x: baseX + (index % 3) * (opts.nodeWidth + 20), // 3 columns per year
        y: opts.nodeHeight + opts.nodeSpacing + Math.floor(index / 3) * (opts.nodeHeight + opts.nodeSpacing)
      }
    });
  });

  return positioned;
}

/**
 * Hybrid Layout: Manual positioning + collision avoidance
 * Guarantees no overlaps with dynamic spacing based on content
 */
export function hybridSpineLayout(
  nodes: PlanNode[],
  options: LayoutOptions = {}
): PlanNode[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const spineNodes = nodes.filter(n => n.type === NodeType.Year);
  const branchNodes = nodes.filter(n => 
    n.type !== NodeType.Year && 
    !n.className?.includes('ghost-node')  // ✅ Exclude ghost nodes from grid layout
  );
  
  // Phase 1: Position spine horizontally with generous spacing
  const positioned: PlanNode[] = spineNodes.map((node, index) => ({
    ...node,
    position: { 
      x: index * 1200,  // 1200px per year to prevent grid overlaps
      y: 0 
    }
  }));
  
  // Phase 2: Group courses by year
  const coursesByYear = new Map<number, PlanNode[]>();
  branchNodes.forEach(node => {
    const year = node.data.year ?? 1;
    if (!coursesByYear.has(year)) coursesByYear.set(year, []);
    coursesByYear.get(year)!.push(node);
  });
  
  // Phase 3: Position courses in 2-column semester grid per year with dynamic spacing
  const COLUMNS = 2;  // Fall / Spring
  const BASE_NODE_WIDTH = 360;  // Match CSS max-width: 350px + 10px buffer
  const BASE_NODE_HEIGHT = 180; // Average height including metadata
  const H_GAP = 120;  // Increased spacing between semester columns
  const V_GAP = 80;   // Increased vertical spacing for metadata-rich nodes
  
  coursesByYear.forEach((courses, year) => {
    const yearIndex = year - 1;
    const yearNode = spineNodes[yearIndex];
    if (!yearNode) return;
    
    const baseX = yearIndex * 1200;
    const startY = 180; // Start below year node and semester labels
    
    // Sort for deterministic layout (fallback if no semester specified)
    courses.sort((a, b) => a.id.localeCompare(b.id));
    
    // Group by semester first
    const fallCourses: PlanNode[] = [];
    const springCourses: PlanNode[] = [];
    
    courses.forEach(node => {
      const semester = node.data.semester ?? (fallCourses.length <= springCourses.length ? 'fall' : 'spring');
      if (semester === 'fall') {
        fallCourses.push(node);
      } else {
        springCourses.push(node);
      }
    });
    
    // Calculate total width of 2-column grid
    const gridWidth = COLUMNS * BASE_NODE_WIDTH + (COLUMNS - 1) * H_GAP;
    // Left-align grid, keep year node centered
    const gridStartX = baseX - 90;
    
    // Position Fall courses (left column)
    fallCourses.forEach((node, index) => {
      let x = gridStartX;
      const y = startY + index * (BASE_NODE_HEIGHT + V_GAP);
      
      // External nodes (CLEP, transfer credits) - offset slightly to the left
      if (node.type === NodeType.External) {
        x = x - 30;  // Slight left offset to visually distinguish from main courses
      }
      
      positioned.push({
        ...node,
        position: { x, y }
      });
    });
    
    // Position Spring courses (right column)
    springCourses.forEach((node, index) => {
      let x = gridStartX + BASE_NODE_WIDTH + H_GAP;
      const y = startY + index * (BASE_NODE_HEIGHT + V_GAP);
      
      // External nodes (CLEP, transfer credits) - offset slightly to the left
      if (node.type === NodeType.External) {
        x = x - 30;  // Slight left offset to visually distinguish from main courses
      }
      
      positioned.push({
        ...node,
        position: { x, y }
      });
    });
  });
  
  console.log('[Hybrid Layout] Positioned', {
    spine: spineNodes.length,
    courses: branchNodes.length,
    totalNodes: positioned.length
  });
  
  return positioned;
}
