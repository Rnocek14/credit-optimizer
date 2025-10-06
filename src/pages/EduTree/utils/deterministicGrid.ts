/**
 * Deterministic Grid - Reserved column anchors for consistent positioning  
 * Uses centralized layout tokens for perfect symmetry
 */

import { laneXs, LANE_Y_POSITIONS, snapToGrid, packLane, TRACK_COLUMN_OFFSET } from './layoutTokens';

export type Lane = 'up' | 'down';
export type TrackId = 'se' | 'ds' | string | undefined;

/**
 * Calculate track-specific X offset for fork-year lanes
 * Applies horizontal separation for SE/DS tracks to reduce visual clutter
 * @param yearColX - Base X position for the year column
 * @param trackId - Track identifier ('se', 'ds', or undefined for core/shared)
 * @returns Adjusted X position with track offset applied
 */
export function getTrackColumnX(yearColX: number, trackId: TrackId): number {
  if (!trackId) return yearColX;                                    // core/shared nodes stay centered
  if (trackId === 'se') return yearColX - TRACK_COLUMN_OFFSET;      // SE track: left offset
  if (trackId === 'ds') return yearColX + TRACK_COLUMN_OFFSET;      // DS track: right offset
  // Future tracks: deterministic left/right spread by string hash
  const hash = [...String(trackId)].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return yearColX + (hash % 2 === 0 ? -TRACK_COLUMN_OFFSET : TRACK_COLUMN_OFFSET);
}

/**
 * Get reserved column positions based on viewport width
 * All positioning derives from centralized layout tokens
 */
export function getReservedColsByYear(viewW: number = 1800): Record<number, Record<string, number>> {
  const lanes = laneXs(viewW);
  
  return {
    1: { 
      shared: lanes.y1  // Y1 is always shared, single column
    },
    2: { 
      shared: lanes.y2,    // Fallback for shared Y2 content
      up: lanes.y2,        // SE/CS lane - upper track
      down: lanes.y2,      // DS/IT lane - lower track  
      gate: lanes.gatePG   // Program gate between Y1 and Y2
    },
    3: { 
      gate: lanes.gateTG,  // Gate position at center of track spread
      up: lanes.y3L,       // SE track - left branch
      down: lanes.y3R      // DS track - right branch
    },
    4: { 
      up: lanes.y4L,       // SE final year - left branch
      down: lanes.y4R      // DS final year - right branch
    }
  };
}

/**
 * Reserved Y coordinates for up/down lanes by year
 * Uses centralized lane positioning with enhanced separation
 */
export const reservedRowsByLane = LANE_Y_POSITIONS;

/**
 * Re-export packLane from layoutTokens for convenience
 */
export { packLane };

/**
 * Apply deterministic grid coordinates to a node's phase A plan
 * Uses centralized layout tokens for consistent positioning
 */
export function applyDeterministicGrid(
  levelYear: number,
  lane: Lane | undefined,
  manualX: number,
  manualY: number,
  useGrid: boolean,
  singleRailStraight: boolean = false,
  viewW: number = 1800
): { x: number; y: number } {
  if (!useGrid) {
    return { x: manualX, y: manualY };
  }

  // Get reserved columns using centralized layout tokens
  const yearCols = getReservedColsByYear(viewW)[levelYear];
  if (!yearCols) {
    console.warn('[DeterministicGrid] No reserved columns for year:', levelYear);
    return { x: manualX, y: manualY };
  }

  // Determine which column to use
  let gridX: number;
  if (lane && yearCols[lane] !== undefined) {
    gridX = yearCols[lane];
  } else if (yearCols.shared !== undefined) {
    gridX = yearCols.shared;
  } else if (yearCols.gate !== undefined) {
    gridX = yearCols.gate; // For virtual gate nodes
  } else {
    console.warn('[DeterministicGrid] No reserved column for year/lane:', levelYear, lane);
    gridX = manualX; // Fallback to manual
  }

  // Use reserved row Y if available, otherwise keep manual Y
  let gridY = manualY;
  if (singleRailStraight) {
    // In single-rail straight mode, use center line for all nodes
    gridY = reservedRowsByLane[levelYear]?.center ?? 360;
  } else if (lane && reservedRowsByLane[levelYear]?.[lane] !== undefined) {
    gridY = reservedRowsByLane[levelYear][lane];
  }

  // Snap to grid for perfect alignment
  return { x: snapToGrid(gridX), y: snapToGrid(gridY) };
}

/**
 * Validate that grid coordinates are consistent across lanes
 * Used for testing that SE and DS routes have identical column positions
 */
export function validateGridConsistency(
  nodes: Array<{ data: { phaseAPlan?: { lane: Lane | undefined; col: number; x: number; y: number } } }>,
  viewW: number = 1800
): { 
  consistent: boolean; 
  issues: Array<{ year: number; expectedX: number; actualX: number; nodeCount: number }> 
} {
  const issues: Array<{ year: number; expectedX: number; actualX: number; nodeCount: number }> = [];
  const reservedCols = getReservedColsByYear(viewW);
  
  // Group nodes by year
  const nodesByYear = new Map<number, typeof nodes>();
  nodes.forEach(node => {
    const plan = node.data.phaseAPlan;
    if (plan) {
      if (!nodesByYear.has(plan.col)) {
        nodesByYear.set(plan.col, []);
      }
      nodesByYear.get(plan.col)!.push(node);
    }
  });

  // Check each year for consistent column usage
  nodesByYear.forEach((yearNodes, year) => {
    const upNodes = yearNodes.filter(n => n.data.phaseAPlan?.lane === 'up');
    const downNodes = yearNodes.filter(n => n.data.phaseAPlan?.lane === 'down');
    
    // All up lane nodes should have same X
    const upXs = [...new Set(upNodes.map(n => n.data.phaseAPlan!.x))];
    if (upXs.length > 1) {
      issues.push({ 
        year, 
        expectedX: reservedCols[year]?.up || 0, 
        actualX: upXs[0], 
        nodeCount: upNodes.length 
      });
    }
    
    // All down lane nodes should have same X  
    const downXs = [...new Set(downNodes.map(n => n.data.phaseAPlan!.x))];
    if (downXs.length > 1) {
      issues.push({ 
        year, 
        expectedX: reservedCols[year]?.down || 0, 
        actualX: downXs[0], 
        nodeCount: downNodes.length 
      });
    }
  });

  return {
    consistent: issues.length === 0,
    issues
  };
}

/**
 * DevTools helper for testing grid consistency
 * Usage in console: window.__validateGridConsistency()
 */
export function exposeGridValidation() {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    (window as any).__validateGridConsistency = () => {
      const nodes = (window as any).__flowNodes__ || [];
      return validateGridConsistency(nodes);
    };
    
    (window as any).__reservedCols = getReservedColsByYear();
    console.log('[DeterministicGrid] Grid validation exposed to window.__validateGridConsistency()');
  }
}
