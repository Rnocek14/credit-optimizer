/**
 * Deterministic Grid - Reserved column anchors for consistent positioning
 * Ensures SE and DS single-track routes use identical column positions
 */

export type Lane = 'up' | 'down';

/**
 * Reserved X coordinates for each year/lane combination
 * These ensure consistent column positioning across different single-track views
 */
export const reservedColsByYear: Record<number, Record<string, number>> = {
  1: { 
    shared: 200  // Y1 is always shared, single column
  },
  2: { 
    shared: 600,  // Fallback for shared Y2 content
    up: 600,      // SE/CS lane - upper track
    down: 600,    // DS/IT lane - lower track
    gate: 400     // Program gate between Y1 and Y2
  },
  3: { 
    gate: 900,    // Gate position between Y2 and Y3
    up: 1300,     // SE track - upper lane
    down: 1300    // DS track - lower lane
  },
  4: { 
    up: 1700,     // SE final year - upper lane
    down: 1700    // DS final year - lower lane
  }
};

/**
 * Reserved Y coordinates for up/down lanes by year
 * Preserves vertical relationships from manual seed
 */
export const reservedRowsByLane: Record<number, Record<Lane | 'center', number>> = {
  2: {
    up: 240,     // Upper lane Y2 courses
    down: 480,   // Lower lane Y2 courses
    center: 360  // Single-track straight line
  },
  3: {
    up: 240,     // Upper lane Y3 courses
    down: 480,   // Lower lane Y3 courses
    center: 360  // Single-track straight line
  },
  4: {
    up: 80,      // Upper lane Y4 courses (higher up)
    down: 640,   // Lower lane Y4 courses (lower down)
    center: 360  // Single-track straight line
  }
};

/**
 * Apply deterministic grid coordinates to a node's phase A plan
 * Snaps X to reserved columns, preserves Y from manual positioning
 */
export function applyDeterministicGrid(
  levelYear: number,
  lane: Lane | undefined,
  manualX: number,
  manualY: number,
  useGrid: boolean,
  singleRailStraight: boolean = false
): { x: number; y: number } {
  if (!useGrid) {
    return { x: manualX, y: manualY };
  }

  // Get reserved column for this year/lane
  const yearCols = reservedColsByYear[levelYear];
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

  return { x: gridX, y: gridY };
}

/**
 * Validate that grid coordinates are consistent across lanes
 * Used for testing that SE and DS routes have identical column positions
 */
export function validateGridConsistency(
  nodes: Array<{ data: { phaseAPlan?: { lane: Lane | undefined; col: number; x: number; y: number } } }>
): { 
  consistent: boolean; 
  issues: Array<{ year: number; expectedX: number; actualX: number; nodeCount: number }> 
} {
  const issues: Array<{ year: number; expectedX: number; actualX: number; nodeCount: number }> = [];
  
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
        expectedX: reservedColsByYear[year]?.up || 0, 
        actualX: upXs[0], 
        nodeCount: upNodes.length 
      });
    }
    
    // All down lane nodes should have same X  
    const downXs = [...new Set(downNodes.map(n => n.data.phaseAPlan!.x))];
    if (downXs.length > 1) {
      issues.push({ 
        year, 
        expectedX: reservedColsByYear[year]?.down || 0, 
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
    
    (window as any).__reservedCols = reservedColsByYear;
    console.log('[DeterministicGrid] Grid validation exposed to window.__validateGridConsistency()');
  }
}
