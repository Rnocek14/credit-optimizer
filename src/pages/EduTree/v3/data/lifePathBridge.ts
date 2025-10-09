/**
 * Phase 2: Life Path Bridge
 * 
 * Maps Life Path Graph (GraphNode/GraphEdge) to V3 format (V3Node/V3Edge)
 * Detects alternatives and counts them for Phase 3 checkpoint rendering
 * 
 * CRITICAL: Phase 2 has ZERO visual changes - same 7-node spine renders
 * We only count alternatives in meta, not render them yet
 */

import type { GraphNode, GraphEdge } from '@/types/lifePathGraph';
import type { V3Node, V3Edge, PathLineage } from '../types/v3';
import { VERT } from '../utils/layoutTokensVertical';

export interface BridgeOptions {
  showAlternatives?: boolean;        // Phase 2: default false (no visual change)
  maxInlineAlternatives?: number;    // Phase 4: will use this for top-N selection
}

export interface BridgeMeta {
  forksDetected: number;        // Count of alternative edges (≥1 proves data richness)
  tiers: number;                // Max tier depth + 1
  slugsUsed: string[];          // Canonical slugs for deep links
  alternativesByNode: Record<string, number>; // Per-node alternative count (Phase 3 uses this)
}

/**
 * Converts Life Path Graph to V3 format
 * Phase 2: Renders same spine, just counts alternatives for future use
 */
export function lifePathToV3(
  graph: { nodes: GraphNode[]; edges: GraphEdge[] },
  opts: BridgeOptions = {}
): { nodes: V3Node[]; edges: V3Edge[]; meta: BridgeMeta } {
  const nodes: V3Node[] = [];
  const edges: V3Edge[] = [];
  const slugs = new Set<string>();
  let forksDetected = 0;
  let maxTier = 0;
  const alternativesByNode: Record<string, number> = {};

  // Count alternatives per source node
  const altMap = new Map<string, GraphEdge[]>();
  for (const ge of graph.edges) {
    if (ge.type === 'alternative') {
      const existing = altMap.get(ge.sourceId) || [];
      existing.push(ge);
      altMap.set(ge.sourceId, existing);
      forksDetected++;
      
      if (import.meta.env.DEV) {
        console.log('[Bridge] Alternative edge detected:', {
          edgeId: ge.id,
          sourceId: ge.sourceId,
          targetId: ge.targetId,
          forksDetected
        });
      }
    }
  }

  // 1) Map GraphNode → V3Node (tier comes from depth)
  for (const gn of graph.nodes) {
    const tier = gn.attributes?.depth ?? 0;
    maxTier = Math.max(maxTier, tier);

    // Generate canonical slug from tags or fallback to ID
    let canonicalSlug = gn.id;
    const slugTag = gn.tags.find(t => t.startsWith('slug:'));
    if (slugTag) {
      canonicalSlug = slugTag.replace('slug:', '');
      slugs.add(canonicalSlug);
    }

    // Count alternatives for this node (used in Phase 3 for checkpoint detection)
    const altCount = altMap.get(gn.id)?.length ?? 0;
    if (altCount > 0) {
      alternativesByNode[gn.id] = altCount;
      
      if (import.meta.env.DEV) {
        console.log('[Bridge] Node with alternatives:', {
          nodeId: gn.id,
          altCount,
          alternativesByNode: alternativesByNode[gn.id]
        });
      }
    }

    // Map node type: keep visuals identical in Phase 2
    const nodeType = mapNodeType(gn.type);

    // Build lineage (Phase 3 will use this for canonical paths)
    const lineage: PathLineage = {
      levels: [
        { type: 'degree_level', slug: canonicalSlug, label: gn.title }
      ],
      canonicalSlug
    };

    nodes.push({
      id: gn.id,
      type: nodeType,
      data: {
        tier,
        tierLabel: `Tier ${tier}`, // Simple fallback, attributes.tierLabel doesn't exist on GraphNode
        title: gn.title,
        lineage,
        // Phase 2: Don't show alternatives yet (keep visuals identical)
        showAlternatives: false,
        alternatives: undefined,
        // Keep totalCredits if available
        totalCredits: gn.credits,
      },
      position: { x: 0, y: 0 }, // Layout engine will place
    });
  }

  // 2) Map GraphEdge → V3Edge (filter out alternatives visually)
  for (const ge of graph.edges) {
    // Phase 2: Skip alternative edges (not rendered yet)
    if (ge.type === 'alternative') {
      continue;
    }

    const kind = mapEdgeType(ge.type);

    edges.push({
      id: ge.id,
      source: ge.sourceId,
      target: ge.targetId,
      kind,
      data: {
        transferRate: ge.creditTransferRate,
      },
    });
  }

  console.log('[Bridge] Mapped Life Path Graph:', {
    nodes: nodes.length,
    edges: edges.length,
    forksDetected,
    tiers: maxTier + 1,
    alternativesByNode: Object.keys(alternativesByNode).length
  });

  return {
    nodes,
    edges,
    meta: {
      forksDetected,
      tiers: maxTier + 1,
      slugsUsed: Array.from(slugs),
      alternativesByNode,
    },
  };
}

/**
 * Maps Life Path Graph node types to V3 node types
 * Phase 2: Conservative mapping to keep visuals identical
 */
function mapNodeType(lpType: string): V3Node['type'] {
  // Map to existing V3 types (Phase 2: no new visuals)
  switch (lpType) {
    case 'skill':
    case 'course':
    case 'certification':
    case 'credential':
    case 'creditBlock':
      return 'track-bundle'; // Render as bundle for now
    case 'job':
    case 'jobGoal':
      return 'gate'; // Jobs act as decision points
    default:
      return 'track-bundle';
  }
}

/**
 * Maps Life Path Graph edge types to V3 edge kinds
 */
function mapEdgeType(lpType: string): V3Edge['kind'] {
  switch (lpType) {
    case 'requires':
      return 'prereq';
    case 'stacksInto':
    case 'buildsSkill':
      return 'spine';
    case 'qualifiesFor':
      return 'gate';
    case 'equivalentTo':
      return 'advisory'; // Phase 2: render as advisory (not alternative yet)
    case 'creditTransfersTo':
      return 'advisory';
    default:
      return 'spine';
  }
}

/**
 * Phase 3 helper: Ranks alternatives using RANKING_WEIGHTS
 * Returns top-N + overflow for checkpoint drawer
 * 
 * NOT USED IN PHASE 2 - included for Phase 3 readiness
 */
export function rankAlternatives(
  alternatives: GraphNode[],
  weights = VERT.RANKING_WEIGHTS
): { top2: GraphNode[]; overflow: GraphNode[] } {
  // Normalize and score each alternative
  const scored = alternatives.map(alt => {
    // Calculate normalized scores (0-1 range)
    const creditsScore = (alt.credits ?? 0) / 120; // Max 120 credits
    const timeScore = 1 - Math.min((alt.estimatedHours ?? 0) / 2000, 1); // Lower is better
    const costScore = 1 - Math.min((alt.cost ?? 0) / 50000, 1); // Lower is better
    const outcomeScore = (alt.skillOutcomes?.length ?? 0) / 10; // More outcomes = better

    // Weighted sum
    const score =
      weights.CREDITS_KEPT * creditsScore +
      weights.TIME_WEEKS * timeScore +
      weights.COST_USD * costScore +
      weights.OUTCOME_ALIGNMENT * outcomeScore;

    return { node: alt, score };
  });

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  // Extract top 2 + overflow
  const top2 = scored.slice(0, 2).map(s => s.node);
  const overflow = scored.slice(2).map(s => s.node);

  return { top2, overflow };
}
