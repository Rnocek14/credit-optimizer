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
 * Calculate vertical layout positions for all nodes
 * 
 * @param nodes - Input nodes (positions will be overwritten)
 * @param tokens - Layout constants (defaults to VERT)
 * @returns New array of positioned nodes
 */
export function calculateVerticalLayout(
  nodes: V3Node[],
  tokens: VerticalTokens = VERT
): V3Node[] {
  const t = tokens;
  const out = nodes.map(n => ({ 
    ...n, 
    position: { x: 0, y: 0 },
    sourcePosition: 'bottom' as const,
    targetPosition: 'top' as const,
  }));

  // Extract semantic nodes
  const y1 = out.find(n => isBundle(n) && n.data?.year === 1 && trackKey(n) === 'any');
  const programGate = out.find(n => isGate(n) && n.data?.year === 2);
  const y2 = out.find(n => isBundle(n) && n.data?.year === 2 && trackKey(n) === 'any');
  const trackGate = out.find(n => isGate(n) && n.data?.year === 3);
  const y3se = out.find(n => isBundle(n) && n.data?.year === 3 && trackKey(n) === 'se');
  const y3ds = out.find(n => isBundle(n) && n.data?.year === 3 && trackKey(n) === 'ds');
  const y4 = out.find(n => isBundle(n) && n.data?.year === 4 && trackKey(n) === 'any');

  let cursorY = 0;

  // Helper: center a node on the spine and advance cursor
  const placeCenter = (node: V3Node | undefined, height: number) => {
    if (!node) return;
    node.position.x = snap(t.CENTER_X, t.GRID);
    node.position.y = snap(cursorY, t.GRID);
    cursorY += height + t.VERTICAL_GAP;
  };

  // 1. Year 1 (top of spine)
  placeCenter(y1, t.NODE_HEIGHT);

  // 2. Program Gate (decision point: Y1 → Y2)
  placeCenter(programGate, t.GATE_HEIGHT);

  // 3. Year 2
  placeCenter(y2, t.NODE_HEIGHT);

  // 4. Track Gate (decision point: Y2 → Y3)
  placeCenter(trackGate, t.GATE_HEIGHT);

  // 5. Year 3 split (SE and DS side-by-side, same Y row)
  // Single-track mode: center the lone track
  const y3RowY = snap(cursorY, t.GRID);
  const hasSE = !!y3se;
  const hasDS = !!y3ds;
  
  if (hasSE && hasDS) {
    // Both tracks: side-by-side
    y3se.position.x = snap(t.CENTER_X - t.H_SPACING / 2, t.GRID);
    y3se.position.y = y3RowY;
    y3ds.position.x = snap(t.CENTER_X + t.H_SPACING / 2, t.GRID);
    y3ds.position.y = y3RowY;
  } else {
    // Single track: center it on the spine
    const solo = y3se ?? y3ds;
    if (solo) {
      solo.position.x = snap(t.CENTER_X, t.GRID);
      solo.position.y = y3RowY;
    }
    // Hide comparison UI and enable single-track mode
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

  // 6. Year 4 (merge point, back to center)
  placeCenter(y4, t.NODE_HEIGHT);

  // 7. Position checkpoint nodes (Phase 3a)
  // Checkpoints appear above their source nodes, centered on spine
  const checkpoints = out.filter(n => n.type === 'checkpoint');
  checkpoints.forEach(cp => {
    const sourceNode = out.find(n => n.id === cp.data?.sourceNodeId);
    if (sourceNode) {
      cp.position.x = snap(t.CENTER_X, t.GRID);
      cp.position.y = snap(sourceNode.position.y - t.TIER_SPACING_PX, t.GRID);
    }
  });

  return out;
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
