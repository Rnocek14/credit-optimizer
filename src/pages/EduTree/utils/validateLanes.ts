import { Node } from '@xyflow/react';
import { LAYOUT_CONSTANTS } from './layoutConstants';

const ROW = LAYOUT_CONSTANTS.LANE_ROWS;

type V2NodeData = {
  program_id?: string | null;
  track_id?: string | null;
  isVirtual?: boolean;
};

const UP_ROWS = new Set([ROW.UP_CORE, ROW.UP_ELECTIVES, ROW.UP_TRACK_A, ROW.UP_TRACK_B, ROW.UP_CAPSTONE]);
const DOWN_ROWS = new Set([ROW.DOWN_CORE, ROW.DOWN_ELECTIVES, ROW.DOWN_CAPSTONE]);
const TRACK_ROWS_UP = new Set([ROW.UP_TRACK_A, ROW.UP_TRACK_B]);

export function validateProgramCompareLanes(nodes: Node[]): {
  issues: number; details: string[];
} {
  const details: string[] = [];

  // PHASE 3: Enhanced validation - also check for data integrity
  const trackNodes = nodes.filter(n => {
    const d = (n.data || {}) as V2NodeData;
    return d.track_id && ['se', 'ds'].includes(d.track_id);
  });

  // Data integrity check: track nodes must have program_id
  for (const n of trackNodes) {
    const d = (n.data || {}) as V2NodeData;
    if (!d.program_id) {
      details.push(`Track node missing program_id: ${n.id} (track=${d.track_id})`);
    }
  }

  for (const n of nodes) {
    const d = (n.data || {}) as V2NodeData;
    // ignore gates & Y1 shared
    if (d.isVirtual || !d.program_id) continue;

    const y = n.position?.y ?? 0;
    const where = (set: Set<number>) => set.has(y);

    // 1) CS must never be in DOWN rows
    if (d.program_id === 'bs_cs' && where(DOWN_ROWS)) {
      details.push(`CS node in LOWER lane: ${n.id} @y=${y}`);
    }

    // 2) IT must never be in UP rows
    if (d.program_id === 'bs_it' && where(UP_ROWS)) {
      details.push(`IT node in UPPER lane: ${n.id} @y=${y}`);
    }

    // 3) Track nodes (SE/DS) must be in UPPER track rows
    if (d.program_id === 'bs_cs' && d.track_id) {
      if (!where(TRACK_ROWS_UP)) {
        details.push(
          `CS track node not in TRACK lane: ${n.id} (track=${d.track_id}) @y=${y}`
        );
      }
    }
  }

  // PHASE 3: Log validation results for all comparison modes
  if (details.length > 0) {
    console.warn('[LaneValidation] Lane violations detected:', details);
  } else {
    console.log('[LaneValidation] All lane assignments valid ✓');
  }

  return { issues: details.length, details };
}