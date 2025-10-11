/**
 * Pure vertical layout engine
 * 
 * Flow: Y1 → Program Gate → Y2 → Track Gate → (SE | DS) → Y4
 * All nodes connect top-to-bottom. Y3 tracks appear side-by-side at the same Y.
 * 
 * Design principles:
 * - Deterministic: same input always produces same output
 * - Single pass: no collision resolution needed
 * - Grid-aligned: all positions snap to GRID constant
 * - Handle uniformity: all nodes use sourcePosition='bottom', targetPosition='top'
 */

import type { V3Node } from '../types/v3';
import { VERT, type VerticalTokens } from '../utils/layoutTokensVertical';

const snap = (n: number, grid: number) => Math.round(n / grid) * grid;

type TrackKey = 'se' | 'ds' | 'any' | undefined;

function isGate(n: V3Node): boolean {
  return n.type === 'gate' || String(n.id).includes('gate');
}

function isBundle(n: V3Node): boolean {
  return n.type === 'track-bundle';
}

function trackKey(n: V3Node): TrackKey {
  return (n.data?.trackId as TrackKey) ?? 'any';
}

/**
 * Year-based layout for seed data (original logic)
 */
function layoutByYear(nodes: V3Node[], t: VerticalTokens): V3Node[] {
  // Extract semantic nodes
  const y1 = nodes.find(n => isBundle(n) && n.data?.year === 1 && trackKey(n) === 'any');
  const programGate = nodes.find(n => isGate(n) && n.data?.year === 2);
  const y2 = nodes.find(n => isBundle(n) && n.data?.year === 2 && trackKey(n) === 'any');
  const trackGate = nodes.find(n => isGate(n) && n.data?.year === 3);
  const y3se = nodes.find(n => isBundle(n) && n.data?.year === 3 && trackKey(n) === 'se');
  const y3ds = nodes.find(n => isBundle(n) && n.data?.year === 3 && trackKey(n) === 'ds');
  const y4 = nodes.find(n => isBundle(n) && n.data?.year === 4 && trackKey(n) === 'any');
  
  // Validate required nodes exist - fallback to tier layout if incomplete
  const hasRequiredNodes = y1 && programGate && y2 && trackGate && (y3se || y3ds) && y4;
  
  if (!hasRequiredNodes) {
    if (import.meta.env.DEV) {
      console.warn('[Vertical Layout] Incomplete seed data, falling back to tier layout:', {
        y1: !!y1, programGate: !!programGate, y2: !!y2, 
        trackGate: !!trackGate, y3se: !!y3se, y3ds: !!y3ds, y4: !!y4
      });
    }
    return layoutByTier(nodes, t);
  }

  if (import.meta.env.DEV) {
    console.log('[Vertical Layout] Year-based layout (Seed mode):', {
      y1: y1?.id,
      programGate: programGate?.id,
      y2: y2?.id,
      trackGate: trackGate?.id,
      y3se: y3se?.id,
      y3ds: y3ds?.id,
      y4: y4?.id
    });
  }

  let cursorY = 0;

  const placeCenter = (node: V3Node | undefined, height: number) => {
    if (!node) return;
    node.position.x = snap(t.CENTER_X, t.GRID);
    node.position.y = snap(cursorY, t.GRID);
    cursorY += height + t.VERTICAL_GAP;
  };

  // Year 1 → Program Gate → Year 2 → Track Gate
  placeCenter(y1, t.NODE_HEIGHT);
  placeCenter(programGate, t.GATE_HEIGHT);
  placeCenter(y2, t.NODE_HEIGHT);
  placeCenter(trackGate, t.GATE_HEIGHT);

  // Year 3 split (SE/DS side-by-side)
  const y3RowY = snap(cursorY, t.GRID);
  const hasSE = !!y3se;
  const hasDS = !!y3ds;
  
  if (hasSE && hasDS) {
    y3se.position.x = snap(t.CENTER_X - t.H_SPACING / 2, t.GRID);
    y3se.position.y = y3RowY;
    y3ds.position.x = snap(t.CENTER_X + t.H_SPACING / 2, t.GRID);
    y3ds.position.y = y3RowY;
  } else {
    const solo = y3se ?? y3ds;
    if (solo) {
      solo.position.x = snap(t.CENTER_X, t.GRID);
      solo.position.y = y3RowY;
    }
    if (trackGate && solo) {
      trackGate.data = { 
        ...trackGate.data, 
        showCompare: false,
        singleTrackMode: true,
        activeTrack: solo.data.trackId as 'se' | 'ds'
      };
    }
  }
  cursorY += t.NODE_HEIGHT + t.VERTICAL_GAP;

  // Year 4 merge
  placeCenter(y4, t.NODE_HEIGHT);

  // Position checkpoints
  const checkpoints = nodes.filter(n => n.type === 'checkpoint');
  checkpoints.forEach(cp => {
    const sourceNode = nodes.find(n => n.id === cp.data?.sourceNodeId);
    if (sourceNode) {
      cp.position.x = sourceNode.position.x;
      cp.position.y = snap(sourceNode.position.y + t.TIER_SPACING_PX, t.GRID);
    }
  });

  return nodes;
}

/**
 * Tier-based layout for LifePath data
 */
function layoutByTier(nodes: V3Node[], t: VerticalTokens): V3Node[] {
  const checkpoints: V3Node[] = [];
  const regularNodes: V3Node[] = [];
  
  nodes.forEach(n => {
    if (n.type === 'checkpoint') {
      checkpoints.push(n);
    } else {
      regularNodes.push(n);
    }
  });
  
  // Group regular nodes by tier (with type coercion)
  const byTier = new Map<number, V3Node[]>();
  regularNodes.forEach(n => {
    const rawTier = n.data?.tier ?? 0;
    const tier = typeof rawTier === 'string' ? parseInt(rawTier, 10) : rawTier;
    const safeTier = Number.isFinite(tier) ? tier : 0;
    if (!byTier.has(safeTier)) byTier.set(safeTier, []);
    byTier.get(safeTier)!.push(n);
  });
  
  const tierKeys = Array.from(byTier.keys());
  const maxTier = tierKeys.length > 0 ? Math.max(...tierKeys) : 0;
  let cursorY = 0;
  
  if (import.meta.env.DEV) {
    console.log('[Vertical Layout] Tier-based layout (LifePath mode):', {
      tierCount: maxTier + 1,
      checkpointCount: checkpoints.length,
      tiersDetail: Array.from(byTier.entries()).map(([tier, ns]) => ({
        tier,
        count: ns.length,
        nodes: ns.map(n => ({ id: n.id, type: n.type, lpType: (n.data as any)?.lpType }))
      }))
    });
  }
  
  // Position each tier vertically
  for (let tier = 0; tier <= maxTier; tier++) {
    const tierNodes = byTier.get(tier) || [];
    
    if (tierNodes.length === 0) continue;
    
    if (tierNodes.length === 1) {
      // Single node: center on spine
      const node = tierNodes[0];
      node.position.x = snap(t.CENTER_X, t.GRID);
      node.position.y = snap(cursorY, t.GRID);
    } else {
      // Multiple nodes: spread horizontally around center
      const totalWidth = (tierNodes.length - 1) * t.H_SPACING;
      const startX = t.CENTER_X - totalWidth / 2;
      
      tierNodes.forEach((node, idx) => {
        node.position.x = snap(startX + idx * t.H_SPACING, t.GRID);
        node.position.y = snap(cursorY, t.GRID);
      });
    }
    
    cursorY += t.NODE_HEIGHT + t.VERTICAL_GAP;
  }
  
  // Position checkpoints after their source nodes
  checkpoints.forEach(cp => {
    const sourceNode = nodes.find(n => n.id === cp.data?.sourceNodeId);
    if (sourceNode) {
      cp.position.x = sourceNode.position.x;
      cp.position.y = snap(sourceNode.position.y + t.TIER_SPACING_PX, t.GRID);
      
      if (import.meta.env.DEV) {
        console.log('[Vertical Layout] Checkpoint positioned:', {
          checkpointId: cp.id,
          sourceId: sourceNode.id,
          pos: { x: cp.position.x, y: cp.position.y }
        });
      }
    } else if (import.meta.env.DEV) {
      console.warn('[Vertical Layout] Checkpoint missing source:', {
        checkpointId: cp.id,
        missingSourceId: cp.data?.sourceNodeId
      });
    }
  });
  
  return nodes;
}

/**
 * Calculate vertical layout positions for all nodes
 * 
 * @param nodes - Input nodes (positions will be overwritten)
 * @param tokens - Layout constants (defaults to VERT)
 * @returns New array of positioned nodes
 */
export function calculateVerticalLayout(
  nodes: V3Node[],
  tokens: VerticalTokens = VERT,
  forceMode?: 'year' | 'tier'
): V3Node[] {
  const t = tokens;
  const out = nodes.map(n => ({ 
    ...n, 
    position: { x: 0, y: 0 },
    sourcePosition: 'bottom' as const,
    targetPosition: 'top' as const,
  }));

  // Detect layout mode with explicit override
  const hasYearData = out.some(n => 
    typeof n.data?.year === 'number' && n.data.year >= 1 && n.data.year <= 4
  );
  
  const useTierLayout = forceMode === 'tier' || (!forceMode && !hasYearData);
  
  if (import.meta.env.DEV) {
    console.log('[Vertical Layout] Mode selection:', {
      forceMode,
      hasYearData,
      selectedMode: useTierLayout ? 'TIER-BASED (LifePath)' : 'YEAR-BASED (Seed)',
      nodeCount: out.length,
      sampleNodes: out.slice(0, 3).map(n => ({ 
        id: n.id, 
        type: n.type,
        year: n.data?.year, 
        tier: n.data?.tier,
        lpType: n.data?.lpType
      }))
    });
  }
  
  return useTierLayout ? layoutByTier(out, t) : layoutByYear(out, t);
}

/**
 * Validate that a layout has no overlaps (useful for tests/debug)
 */
export function validateVerticalLayout(nodes: V3Node[], tokens: VerticalTokens = VERT): boolean {
  const t = tokens;
  
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      
      const aHeight = isGate(a) ? t.GATE_HEIGHT : t.NODE_HEIGHT;
      const bHeight = isGate(b) ? t.GATE_HEIGHT : t.NODE_HEIGHT;
      
      const xOverlap = Math.abs(a.position.x - b.position.x) < t.NODE_WIDTH;
      const yOverlap = Math.abs(a.position.y - b.position.y) < Math.max(aHeight, bHeight);
      
      if (xOverlap && yOverlap) {
        console.warn(`Overlap detected: ${a.id} and ${b.id}`);
        return false;
      }
    }
  }
  
  return true;
}
