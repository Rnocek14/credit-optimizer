/**
 * Auto-Mode Detection for EduTree Canvas V2
 * Determines whether to render single base plan or dual comparison overlay
 */

import type { Selection } from '../ctx/PathHighlightContext';

export type RenderMode = 'single' | 'dual';

/**
 * Derive rendering mode from primary and secondary selections
 * - single: A==B or only one selection → render base 4-year plan (no overlay classes)
 * - dual: A≠B → render overlay with class decoration only
 */
export function deriveRenderMode(
  primarySelection?: Selection | null,
  secondarySelection?: Selection | null
): RenderMode {
  // No selections or only one selection → single mode
  if (!primarySelection || !secondarySelection) {
    return 'single';
  }
  
  // Both selections exist - check if they're the same
  const isSame = (
    primarySelection.kind === secondarySelection.kind &&
    primarySelection.id === secondarySelection.id
  );
  
  return isSame ? 'single' : 'dual';
}

/**
 * Stable frame node IDs that represent the full curriculum span
 * These nodes define the viewport boundaries for frame-locked fitView
 */
export const FRAME_NODE_IDS = [
  'rail-y1',
  'rail-y2', 
  'rail-y3',
  'rail-y4',
  'degree-node'
] as const;

/**
 * Gate positioning constant
 */
export const GATE_Y = 360;