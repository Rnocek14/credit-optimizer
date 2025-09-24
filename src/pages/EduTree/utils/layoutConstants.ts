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
    UP_CAPSTONE: 80, UP_ELECTIVES: 120, UP_TRACK_A: 160, UP_TRACK_B: 180, UP_CORE: 240,
    DOWN_CORE: 480, DOWN_ELECTIVES: 600, DOWN_CAPSTONE: 640
  }
};