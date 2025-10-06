/**
 * Layout Tokens - Centralized adaptive spacing system
 * All positioning derives from these tokens for perfect symmetry
 */

export const COL_W = 280;        // Node width
export const COL_GAP = 200;      // Standard gap between years (increased for better spacing)
export const GRID = 8;           // Grid snap unit
export const NODE_HEIGHT = 120;  // Standard node height
export const LANE_GAP = 60;      // Gap between nodes in same lane (increased for visibility)

// Region-Aware Layout System Tokens (Phase 0)
export const REGION_GUTTER = 24;        // Y padding around program regions
export const TRACK_GUTTER = 16;         // Y padding between track corridors  
export const TRACK_COLUMN_OFFSET = 60;  // ±X offset for SE/DS lanes at fork (wider separation)

export const NODE_WIDTH_PX = 180;       // Matches min-w-[180px] from RequirementNode
export const NODE_BASE_HEIGHT = 120;    // Compact baseline
export const NODE_MAX_HEIGHT = 250;     // With expanded course lists
export const COL_TOLERANCE = 48;        // X bucketing for column groups

const snap8 = (n: number) => Math.round(n / GRID) * GRID;

export interface LanePositions {
  y1: number;    // Year 1 column
  y2: number;    // Year 2 column
  y3L: number;   // Year 3 left (SE) column
  y3R: number;   // Year 3 right (DS) column
  y4L: number;   // Year 4 left (SE) column
  y4R: number;   // Year 4 right (DS) column
  gatePG: number; // Program gate X
  gateTG: number; // Track gate X
  spread: number; // Track spread amount
}

/**
 * Calculate adaptive lane positions based on viewport width
 * Ensures perfect symmetry and responsive behavior
 */
export function laneXs(viewW: number = 1800): LanePositions {
  const leftMargin = 200;
  const y1 = leftMargin;
  const y2 = y1 + COL_W + COL_GAP;
  
  // Calculate available space after y1, y2, and space for y3R
  const used = y2 + COL_W; // up to the end of Y2
  const rest = viewW - used - COL_GAP - COL_W; // room for Y3R
  const spread = snap8(Math.max(160, Math.min(360, rest - COL_GAP))); // clamp 160–360px
  
  const y3Center = y2 + COL_W + COL_GAP;
  const y3L = snap8(y3Center - spread / 2);
  const y3R = snap8(y3Center + spread / 2);
  
  return {
    y1,
    y2, 
    y3L,
    y3R,
    y4L: y3L,     // Y4 maintains same positions as Y3
    y4R: y3R,
    gatePG: snap8((y1 + y2) / 2),  // Program gate between Y1 and Y2
    gateTG: y3Center,               // Track gate at center of spread
    spread
  };
}

/**
 * Lane-specific Y coordinates for vertical positioning
 * Designed for symmetric packing with clear separation
 */
export const LANE_Y_POSITIONS = {
  2: {
    up: 240,     // Y2 upper lane
    down: 480,   // Y2 lower lane  
    center: 360  // Center line for gates/single-rail
  },
  3: {
    up: 200,     // Y3 upper lane (SE - start higher)
    down: 520,   // Y3 lower lane (DS - start lower)
    center: 360
  },
  4: {
    up: 120,     // Y4 upper lane (SE - highest)
    down: 600,   // Y4 lower lane (DS - lowest)
    center: 360
  }
} as const;

/**
 * Apply lane packing with grid snapping
 * Keeps X position fixed, only adjusts Y within each lane
 */
export function packLane(
  nodes: Array<{ position: { x: number; y: number } }>, 
  topY: number, 
  slotH: number = NODE_HEIGHT, 
  gap: number = LANE_GAP
): void {
  if (nodes.length === 0) return;
  
  // Sort by current Y position for stable packing
  nodes.sort((a, b) => a.position.y - b.position.y);
  
  let y = snap8(topY);
  for (const node of nodes) {
    // Ensure minimum spacing from previous node
    y = Math.max(y, snap8(node.position.y));
    node.position.y = y;
    y += snap8(slotH + gap);
  }
}

/**
 * Apply comprehensive lane packing to eliminate all overlaps
 * Runs after all other positioning tweaks for final cleanup
 */
export function applyLanePackingFinal(
  nodes: Array<{ position: { x: number; y: number }; data?: any; type?: string }>,
  viewW: number = 1800
): void {
  const xs = laneXs(viewW);
  const tolerance = 40; // X position tolerance for lane grouping
  
  // Group nodes by lane (skip gates, headers, and virtual nodes)
  const y3Left = nodes.filter(n => 
    n.type === 'requirement' && 
    n.data?.levelYear === 3 && 
    Math.abs(n.position.x - xs.y3L) < tolerance
  );
  
  const y3Right = nodes.filter(n => 
    n.type === 'requirement' && 
    n.data?.levelYear === 3 && 
    Math.abs(n.position.x - xs.y3R) < tolerance
  );
  
  const y4Left = nodes.filter(n => 
    n.type === 'requirement' && 
    n.data?.levelYear === 4 && 
    Math.abs(n.position.x - xs.y4L) < tolerance
  );
  
  const y4Right = nodes.filter(n => 
    n.type === 'requirement' && 
    n.data?.levelYear === 4 && 
    Math.abs(n.position.x - xs.y4R) < tolerance
  );
  
  // Apply packing to each lane with lane-specific starting positions
  packLane(y3Left, LANE_Y_POSITIONS[3].up, NODE_HEIGHT, LANE_GAP);
  packLane(y3Right, LANE_Y_POSITIONS[3].down, NODE_HEIGHT, LANE_GAP);
  packLane(y4Left, LANE_Y_POSITIONS[4].up, NODE_HEIGHT, LANE_GAP);
  packLane(y4Right, LANE_Y_POSITIONS[4].down, NODE_HEIGHT, LANE_GAP);
  
  // Log packing results (only in dev)
  if (process.env.NODE_ENV === 'development') {
    const packedCount = y3Left.length + y3Right.length + y4Left.length + y4Right.length;
    if (packedCount > 0) {
      console.log(`[LayoutTokens] Lane packing applied to ${packedCount} nodes across 4 lanes`);
    }
  }
}

/**
 * Snap any coordinate to the grid
 */
export function snapToGrid(value: number): number {
  return snap8(value);
}

/**
 * Get semantic colors for lanes to maintain visual consistency
 */
export const LANE_COLORS = {
  se: {
    primary: 'hsl(var(--primary))',
    bg: 'rgba(var(--primary), 0.03)',
    border: 'rgba(var(--primary), 0.1)',
    accent: 'rgba(var(--primary), 0.15)'
  },
  ds: {
    primary: 'hsl(var(--secondary))', 
    bg: 'rgba(var(--secondary), 0.03)',
    border: 'rgba(var(--secondary), 0.1)',
    accent: 'rgba(var(--secondary), 0.15)'
  }
} as const;