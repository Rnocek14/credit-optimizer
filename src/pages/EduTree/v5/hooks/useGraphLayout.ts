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

export type GraphMode = 'prereq' | 'timeline';

export interface GraphLayoutResult {
  nodes: Node<V5GraphNodeData>[];
  edges: Edge<V5GraphEdgeData>[];
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
        position: { x: 0, y: 0 }, // ELK/timeline will override
      });
    });

    // Step 2: For each basket item, resolve prereqs and add missing ones
    basket.forEach(item => {
      const chain = resolveChain(item.courseId, allOptions, basket);
      
      // Add unmet prereqs as ghost nodes
      chain.chain.forEach(prereqId => {
        if (!seenNodes.has(prereqId)) {
          const option = allOptions.find(o => o.courseId === prereqId);
          if (option) {
            seenNodes.add(prereqId);
            
            nodes.push({
              id: prereqId,
              type: 'v5GraphNode',
              data: {
                courseId: prereqId,
                title: option.title || prereqId,
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
          }
        }
      });
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

    // Step 4: Apply layout based on mode
    if (mode === 'timeline') {
      // Timeline mode: use custom packing
      nodes.forEach(node => {
        const pos = timelinePack.layout.get(node.id);
        if (pos) {
          node.position = { x: pos.x, y: pos.y };
        } else {
          // Prereq nodes: position to the left
          node.position = { x: -300, y: nodes.indexOf(node) * 120 };
        }
      });
    } else {
      // Prereq mode: use ELK layout (async, will trigger re-render)
      applyELKLayout(nodes, edges).catch(err => {
        console.error('[useGraphLayout] ELK layout failed:', err);
      });
    }

    console.log('[useGraphLayout]', {
      mode,
      nodesCount: nodes.length,
      edgesCount: edges.length,
      basketCount: basket.length,
    });

    return { nodes, edges };
  }, [basket, allOptions, mode, timelinePack, maxConcurrent]);
}

/**
 * Apply ELK hierarchical layout (mutates nodes in place)
 */
async function applyELKLayout(
  nodes: Node<V5GraphNodeData>[],
  edges: Edge<V5GraphEdgeData>[]
): Promise<void> {
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
    
    // Update node positions from ELK result
    layout.children?.forEach((child: any) => {
      const node = nodes.find(n => n.id === child.id);
      if (node) {
        node.position = {
          x: child.x ?? 0,
          y: child.y ?? 0,
        };
      }
    });
  } catch (err) {
    console.error('[ELK Layout] Failed:', err);
    // Fallback: simple vertical stacking
    nodes.forEach((node, i) => {
      node.position = { x: 0, y: i * 160 };
    });
  }
}
