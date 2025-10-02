/**
 * Layout constants for EduTree positioning
 * Separated to avoid circular imports
 */

export const LAYOUT_CONSTANTS = {
  YEAR_COLUMNS: { Y1: 200, Y2: 600, Y3: 1300, Y4: 1700 },
  GATE_POSITIONS: { 
    Y1_TO_Y2: 400,  // Program gate after Y1
    Y2_TO_Y3: 900   // Track gate after Y2
  },
  LANE_ROWS: {
    GATE_Y: 360,
    // PATCH 6: Increased vertical padding for better visual separation (+12px gaps)
    UP_CAPSTONE: 80, UP_ELECTIVES: 132, UP_TRACK_A: 172, UP_TRACK_B: 212, UP_CORE: 252,
    DOWN_CORE: 492, DOWN_ELECTIVES: 612, DOWN_CAPSTONE: 652
  }
};