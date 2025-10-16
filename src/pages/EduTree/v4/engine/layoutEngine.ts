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
