import { V2RequirementBlock } from "../data/seedDataV2";
import { LAYOUT_CONSTANTS } from "./layoutConstants";

const ROW = LAYOUT_CONSTANTS.LANE_ROWS;

/**
 * Normalize lanes specifically for compare-programs:
 * - CS lives entirely in upper lanes; SE & DS split in UP_TRACK_A/UP_TRACK_B
 * - IT lives entirely in lower lanes (ghost + capstone included)
 * - Gates are left at their own GATE row
 */
export function normalizeProgramCompareLanes(
  blocks: V2RequirementBlock[],
  selectedPrograms: Set<string>
): V2RequirementBlock[] {
  // Only normalize when we're comparing programs that include CS or IT  
  const csActive = selectedPrograms.has("bs_cs");
  const itActive = selectedPrograms.has("bs_it");

  if (!csActive && !itActive) return blocks;

  return blocks.map((b) => {
    // Never move gates
    if (b.is_virtual) return b;

    // PHASE 2: Defensive inference - if track_id exists but program_id missing, infer CS
    if (b.track_id && ['se', 'ds'].includes(b.track_id) && !b.program_id) {
      console.warn(`[LaneNormalize] Inferring program_id='bs_cs' for track node: ${b.id}`);
      b = { ...b, program_id: 'bs_cs' };
    }

    // CS program (upper lanes)
    if (b.program_id === "bs_cs") {
      // Y2 program-level: core/electives => upper core
      if (!b.track_id) {
        return { ...b, position_y: ROW.UP_CORE };
      }

      // Y3–Y4 track-level: split SE/DS in upper track lanes
      if (b.track_id === "se") {
        return { ...b, position_y: ROW.UP_TRACK_A };
      }
      if (b.track_id === "ds") {
        return { ...b, position_y: ROW.UP_TRACK_B };
      }

      // Fallback for any other CS content
      return { ...b, position_y: ROW.UP_CORE };
    }

    // IT program (lower lanes)
    if (b.program_id === "bs_it") {
      // Everything IT (Y2 cores/electives, Y3 ghost, Y4 capstone) sits in the lower band
      if (import.meta.env.DEV && Math.random() < 0.02) {
        console.log('[DEBUG] Normalizing IT node to DOWN_CORE lane:', {
          id: b.id,
          program_id: b.program_id,
          level_year: b.level_year,
          old_position_y: b.position_y,
          new_position_y: ROW.DOWN_CORE
        });
      }
      return { ...b, position_y: ROW.DOWN_CORE };
    }

    // Year 1 shared (no program_id) stays where it is
    return b;
  }).map((b) => {
    // PHASE 2: Hard guard - CS track nodes must never be in DOWN rows
    if (b.program_id === 'bs_cs' && b.track_id && DOWN_ROWS.has(b.position_y)) {
      console.error(`[LaneNormalize] CRITICAL: CS track node in DOWN lane: ${b.id} @y=${b.position_y}. Force-correcting.`);
      const correctedY = b.track_id === 'se' ? ROW.UP_TRACK_A : ROW.UP_TRACK_B;
      return { ...b, position_y: correctedY };
    }
    return b;
  });
}

// Add helper sets for validation
const UP_ROWS = new Set([ROW.UP_CORE, ROW.UP_ELECTIVES, ROW.UP_TRACK_A, ROW.UP_TRACK_B, ROW.UP_CAPSTONE]);
const DOWN_ROWS = new Set([ROW.DOWN_CORE, ROW.DOWN_ELECTIVES, ROW.DOWN_CAPSTONE]);