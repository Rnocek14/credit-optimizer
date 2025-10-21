import { useMemo } from 'react';
import { Node, Edge } from '@xyflow/react';
import ELK from 'elkjs/lib/elk.bundled.js';
import type { BasketItem } from '../state/usePlanBasket';
import type { MarketplaceOption } from '../types/v5';
import { resolveChain } from '../engine/prereqs';
import { useTimelinePack } from './useTimelinePack';
import type { V5GraphNodeData } from '../components/V5GraphNode';
import type { V5GraphEdgeData } from '../components/V5GraphEdge';

const elk = new ELK();

const MAX_PREREQ_DEPTH = 3;
const MAX_GHOST_NODES = 50;

export type GraphMode = 'prereq' | 'timeline';

export interface GraphLayoutResult {
  nodes: Node<V5GraphNodeData>[];
  edges: Edge<V5GraphEdgeData>[];
  timelinePack: import('./useTimelinePack').TimelineLayout;
}

/**
 * Transform basket items + marketplace options into ReactFlow nodes/edges
 * with automatic layout (ELK for prereq mode, custom packing for timeline)
 */
export function useGraphLayout(
  basket: BasketItem[],
  allOptions: MarketplaceOption[],
  mode: GraphMode,
  maxConcurrent: number
): GraphLayoutResult {
  const timelinePack = useTimelinePack(basket, maxConcurrent);

  return useMemo(() => {
    const nodes: Node<V5GraphNodeData>[] = [];
    const edges: Edge<V5GraphEdgeData>[] = [];
    const seenNodes = new Set<string>();
    let ghostNodeCount = 0;
    
    // Step 1: Add basket items as nodes
    basket.forEach(item => {
      seenNodes.add(item.courseId);
      
      nodes.push({
        id: item.courseId,
        type: 'v5GraphNode',
        data: {
          courseId: item.courseId,
          title: item.title || item.courseId,
          moduleId: item.moduleId,
          credits: item.credits,
          cost_usd: item.cost_usd,
          duration_weeks: item.duration_weeks,
          workload_weekly_hours: item.workload_weekly_hours,
          cri_score: item.cri_score,
          status: item.status,
          providerType: item.providerType,
          isInBasket: true,
        },
        position: { x: 0, y: 0 }, // Will be positioned by layout
      });
    });

    // Step 2: For each basket item, resolve prereqs with depth limiting
    basket.forEach(item => {
      const chain = resolveChain(item.courseId, allOptions, basket);
      const depthMap = new Map<string, number>();
      
      // Calculate depth for each prereq
      const calculateDepth = (courseId: string, visited = new Set<string>()): number => {
        if (visited.has(courseId)) return 0;
        visited.add(courseId);
        
        const option = allOptions.find(o => o.courseId === courseId);
        if (!option || !option.prereq_course_ids?.length) return 0;
        
        const maxPrereqDepth = Math.max(
          ...option.prereq_course_ids.map(p => calculateDepth(p, new Set(visited)))
        );
        return maxPrereqDepth + 1;
      };
      
      chain.chain.forEach(prereqId => {
        const depth = calculateDepth(prereqId);
        depthMap.set(prereqId, depth);
      });
      
      // Add prereqs respecting depth and count limits
      let truncatedPrereqs = 0;
      
      chain.chain.forEach(prereqId => {
        const depth = depthMap.get(prereqId) ?? 0;
        
        if (depth > MAX_PREREQ_DEPTH || ghostNodeCount >= MAX_GHOST_NODES) {
          truncatedPrereqs++;
          return;
        }
        
        if (!seenNodes.has(prereqId)) {
          const option = allOptions.find(o => o.courseId === prereqId);
          
          if (option) {
            seenNodes.add(prereqId);
            ghostNodeCount++;
            
            nodes.push({
              id: prereqId,
              type: 'v5GraphNode',
              data: {
                courseId: prereqId,
                title: option.title?.trim() || prereqId,
                moduleId: 'prereq',
                credits: option.credits,
                cost_usd: option.cost_usd,
                duration_weeks: option.duration_weeks,
                workload_weekly_hours: option.workload_weekly_hours ?? 0,
                cri_score: option.cri_score ?? 50,
                status: 'prereq',
                providerType: option.providerType,
                isInBasket: false,
              },
              position: { x: 0, y: 0 },
            });
          } else {
            // Fallback for missing prereq option
            seenNodes.add(prereqId);
            ghostNodeCount++;
            
            nodes.push({
              id: prereqId,
              type: 'v5GraphNode',
              data: {
                courseId: prereqId,
                title: `Unknown Course (${prereqId})`,
                moduleId: 'prereq',
                credits: 0,
                cost_usd: null,
                duration_weeks: null,
                workload_weekly_hours: 0,
                cri_score: 0,
                status: 'prereq',
                providerType: 'Unknown' as any,
                isInBasket: false,
              },
              position: { x: 0, y: 0 },
            });
          }
        }
      });
      
      // If prereqs were truncated, add a meta-node
      if (truncatedPrereqs > 0) {
        const metaId = `meta-more-prereqs-${item.courseId}`;
        if (!seenNodes.has(metaId)) {
          seenNodes.add(metaId);
          nodes.push({
            id: metaId,
            type: 'v5GraphNode',
            data: {
              courseId: metaId,
              title: `+${truncatedPrereqs} more prerequisites`,
              moduleId: 'prereq',
              credits: 0,
              cost_usd: null,
              duration_weeks: null,
              workload_weekly_hours: 0,
              cri_score: 0,
              status: 'prereq',
              providerType: 'Unknown' as any,
              isInBasket: false,
            },
            position: { x: 0, y: 0 },
          });
          
          // Connect meta-node to the course
          edges.push({
            id: `e-${metaId}-${item.courseId}`,
            source: metaId,
            target: item.courseId,
            type: 'v5GraphEdge',
            data: {
              type: mode === 'prereq' ? 'prereq' : 'timeline',
            },
          });
        }
      }
    });

    // Step 3: Build edges (prerequisites → targets)
    basket.forEach(item => {
      const option = allOptions.find(o => o.courseId === item.courseId);
      const prereqs = option?.prereq_course_ids ?? [];
      
      prereqs.forEach(prereqId => {
        // Only add edge if prereq node exists
        if (seenNodes.has(prereqId)) {
          edges.push({
            id: `e-${prereqId}-${item.courseId}`,
            source: prereqId,
            target: item.courseId,
            type: 'v5GraphEdge',
            data: {
              type: mode === 'prereq' ? 'prereq' : 'timeline',
            },
          });
        }
      });
    });

    // Step 4: Return raw nodes/edges (layout will be applied in GraphView)
    console.log('[useGraphLayout]', {
      mode,
      nodesCount: nodes.length,
      edgesCount: edges.length,
      basketCount: basket.length,
    });

    return { nodes, edges, timelinePack };
  }, [basket, allOptions, mode, timelinePack, maxConcurrent]);
}

export { elk };

/**
 * Apply ELK hierarchical layout (returns new nodes array)
 */
export async function applyELKLayout(
  nodes: Node<V5GraphNodeData>[],
  edges: Edge<V5GraphEdgeData>[]
): Promise<{ nodes: Node<V5GraphNodeData>[] }> {
  const elkNodes = nodes.map(n => ({
    id: n.id,
    width: 256, // w-64 = 16rem = 256px
    height: 140, // approximate card height
  }));

  const elkEdges = edges.map(e => ({
    id: e.id,
    sources: [e.source],
    targets: [e.target],
  }));

  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT', // Left to right (prereqs → courses)
      'elk.spacing.nodeNode': '80',
      'elk.layered.spacing.nodeNodeBetweenLayers': '120',
      'elk.spacing.edgeNode': '30',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.nodePlacement.strategy': 'SIMPLE',
      'elk.padding': '[top=60,left=60,bottom=60,right=60]',
    },
    children: elkNodes,
    edges: elkEdges,
  };

  try {
    const layout = await elk.layout(graph);
    
    // Create new nodes array with updated positions
    const newNodes = nodes.map(node => {
      const child = layout.children?.find((c: any) => c.id === node.id);
      if (child) {
        return {
          ...node,
          position: {
            x: child.x ?? 0,
            y: child.y ?? 0,
          },
        };
      }
      return node;
    });
    
    return { nodes: newNodes };
  } catch (err) {
    console.error('[ELK Layout] Failed:', err);
    // Fallback: simple vertical stacking
    const newNodes = nodes.map((node, i) => ({
      ...node,
      position: { x: 0, y: i * 160 },
    }));
    return { nodes: newNodes };
  }
}
