import { V3Graph, V3Node, V3Edge } from '../types/v3';

/**
 * Progressive Disclosure Engine
 * 
 * Transforms full graph into collapsed view (≤15 nodes)
 * - Year 1, 2, 4: Single "Year card" per year
 * - Year 3: Two "track bundle" cards (SE, DS)
 * - Gates: Always visible decision points
 * 
 * Expansion state controls visibility of child requirements
 */

export interface DisclosureState {
  expandedYears: Set<1 | 2 | 3 | 4>;
  expandedBundles: Set<string>; // bundle IDs like 'y3-se-bundle'
}

export interface BundleCard {
  id: string;
  year: 1 | 2 | 3 | 4;
  trackId?: 'se' | 'ds';
  title: string;
  childCount: number;
  totalCredits: number;
  childIds: string[];
}

/**
 * Creates the default collapsed view
 * Returns: Year cards, track bundles, and gates (≤15 nodes)
 */
export function createCollapsedView(fullGraph: V3Graph): {
  visibleNodes: V3Node[];
  visibleEdges: V3Edge[];
  bundles: Map<string, BundleCard>;
} {
  const bundles = new Map<string, BundleCard>();
  const visibleNodes: V3Node[] = [];
  
  // Group requirements by (year, track)
  const grouped = new Map<string, V3Node[]>();
  const gates: V3Node[] = [];
  
  for (const node of fullGraph.nodes) {
    if (node.type === 'gate') {
      gates.push(node);
      continue;
    }
    
    const year = node.data.year ?? 1;
    const trackId = node.data.trackId;
    const key = trackId ? `y${year}-${trackId}` : `y${year}`;
    
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(node);
  }
  
  // Create bundle cards for each group
  for (const [key, children] of grouped) {
    const first = children[0];
    const year = first.data.year ?? 1;
    const trackId = first.data.trackId;
    
    const bundleId = `${key}-bundle`;
    const title = trackId 
      ? `Year ${year} ${trackId.toUpperCase()} Track`
      : `Year ${year}`;
    
    const totalCredits = children.reduce((sum, n) => 
      sum + (n.data.credits_needed ?? 0), 0
    );
    
    bundles.set(bundleId, {
      id: bundleId,
      year: year as 1 | 2 | 3 | 4,
      trackId: trackId as 'se' | 'ds' | undefined,
      title,
      childCount: children.length,
      totalCredits,
      childIds: children.map(n => n.id)
    });
    
    // Create visual bundle node
    visibleNodes.push({
      id: bundleId,
      type: 'track-bundle',
      data: {
        year: year as 1 | 2 | 3 | 4,
        trackId,
        title,
        childCount: children.length,
        totalCredits,
        isExpanded: false
      },
      position: { x: 0, y: 0 } // Will be positioned by layout engine
    });
  }
  
  // Add gates (always visible)
  visibleNodes.push(...gates);
  
  // Create spine edges (bundle → bundle, bundle → gate)
  const visibleEdges: V3Edge[] = [];
  
  // Year 1 → Gate → Year 2
  const y1Bundle = visibleNodes.find(n => n.id === 'y1-bundle');
  const y2Bundle = visibleNodes.find(n => n.id === 'y2-bundle');
  const programGate = gates.find(g => g.data.year === 1);
  
  if (y1Bundle && programGate) {
    visibleEdges.push({
      id: 'y1-to-gate',
      source: y1Bundle.id,
      target: programGate.id,
      kind: 'spine'
    });
  }
  
  if (programGate && y2Bundle) {
    visibleEdges.push({
      id: 'gate-to-y2',
      source: programGate.id,
      target: y2Bundle.id,
      kind: 'gate'
    });
  }
  
  // Year 2 → Track Gate → Year 3 SE/DS
  const trackGate = gates.find(g => g.data.year === 2);
  const y3SeBundle = visibleNodes.find(n => n.id === 'y3-se-bundle');
  const y3DsBundle = visibleNodes.find(n => n.id === 'y3-ds-bundle');
  
  if (y2Bundle && trackGate) {
    visibleEdges.push({
      id: 'y2-to-track-gate',
      source: y2Bundle.id,
      target: trackGate.id,
      kind: 'spine'
    });
  }
  
  if (trackGate) {
    if (y3SeBundle) {
      visibleEdges.push({
        id: 'track-gate-to-se',
        source: trackGate.id,
        target: y3SeBundle.id,
        kind: 'gate'
      });
    }
    if (y3DsBundle) {
      visibleEdges.push({
        id: 'track-gate-to-ds',
        source: trackGate.id,
        target: y3DsBundle.id,
        kind: 'gate'
      });
    }
  }
  
  // Year 3 → Year 4
  const y4Bundle = visibleNodes.find(n => n.id === 'y4-bundle');
  if (y3SeBundle && y4Bundle) {
    visibleEdges.push({
      id: 'y3se-to-y4',
      source: y3SeBundle.id,
      target: y4Bundle.id,
      kind: 'spine'
    });
  }
  if (y3DsBundle && y4Bundle) {
    visibleEdges.push({
      id: 'y3ds-to-y4',
      source: y3DsBundle.id,
      target: y4Bundle.id,
      kind: 'spine'
    });
  }
  
  return { visibleNodes, visibleEdges, bundles };
}

/**
 * Expands a bundle, replacing it with its child nodes
 */
export function expandBundle(
  bundleId: string,
  currentGraph: V3Graph,
  fullGraph: V3Graph,
  bundles: Map<string, BundleCard>
): V3Graph {
  const bundle = bundles.get(bundleId);
  if (!bundle) return currentGraph;
  
  // Remove bundle node
  const nodes = currentGraph.nodes.filter(n => n.id !== bundleId);
  
  // Add child requirement nodes
  const children = fullGraph.nodes.filter(n => bundle.childIds.includes(n.id));
  nodes.push(...children);
  
  // Update edges: replace bundle edges with child edges
  const edges = currentGraph.edges.filter(e => 
    e.source !== bundleId && e.target !== bundleId
  );
  
  // Add child edges from full graph
  const childEdges = fullGraph.edges.filter(e => 
    bundle.childIds.includes(e.source) || bundle.childIds.includes(e.target)
  );
  edges.push(...childEdges);
  
  return { nodes, edges };
}

/**
 * Collapses expanded nodes back into a bundle
 */
export function collapseBundle(
  bundleId: string,
  currentGraph: V3Graph,
  bundles: Map<string, BundleCard>
): V3Graph {
  const bundle = bundles.get(bundleId);
  if (!bundle) return currentGraph;
  
  // Remove child nodes
  const nodes = currentGraph.nodes.filter(n => !bundle.childIds.includes(n.id));
  
  // Re-add bundle node
  nodes.push({
    id: bundleId,
    type: 'track-bundle',
    data: {
      year: bundle.year,
      trackId: bundle.trackId,
      title: bundle.title,
      childCount: bundle.childCount,
      totalCredits: bundle.totalCredits,
      isExpanded: false
    },
    position: { x: 0, y: 0 }
  });
  
  // Remove edges to/from children, restore bundle edges
  const edges = currentGraph.edges.filter(e => 
    !bundle.childIds.includes(e.source) && !bundle.childIds.includes(e.target)
  );
  
  // Restore spine edges (simple heuristic for now)
  // In production, we'd store original bundle edges
  
  return { nodes, edges };
}
