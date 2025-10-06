/**
 * Layout constants for EduTree positioning
 * Separated to avoid circular imports
 * PATCH 9: SURGICAL FIX - Restore original working positions, only separate overlapping nodes
 */

export const LAYOUT_CONSTANTS = {
  YEAR_COLUMNS: { Y1: 200, Y2: 600, Y3: 1300, Y4: 1700 },
  GATE_POSITIONS: { 
    Y1_TO_Y2: 400,  // Program gate after Y1
    Y2_TO_Y3: 900   // Track gate after Y2
  },
  LANE_ROWS: {
    GATE_Y: 360,
    // Year 2 - Upper lane (CS program) - ORIGINAL WORKING POSITIONS
    UP_ELECTIVES: 132,    // Y2 CS Electives
    UP_CORE: 252,         // Y2 CS Core (120px below, acceptable)
    // Year 3 - Upper lane (SE/DS tracks) - ONLY separate overlaps
    UP_TRACK_A: 172,      // Y3 SE Core (original position - KEEP)
    UP_TRACK_A_ELEC: 392, // Y3 SE Electives (220px below SE Core - NEW)
    UP_TRACK_B: 212,      // Y3 DS Core (original position - KEEP)
    UP_TRACK_B_ELEC: 432, // Y3 DS Electives (220px below DS Core - NEW)
    // Year 4 - Upper lane capstones - ONLY separate overlaps
    UP_CAPSTONE: 80,      // Y4 SE Capstone (original position - KEEP)
    UP_CAPSTONE_2: 300,   // Y4 DS Capstone (220px below SE - NEW)
    // Year 2/4 - Lower lane (IT program) - ORIGINAL WORKING POSITIONS
    DOWN_CORE: 492,       // Y2 IT Core
    DOWN_ELECTIVES: 712,  // Y2 IT Electives (220px below Core - increase gap)
    DOWN_CAPSTONE: 652    // Y4 IT Capstone (original position)
  }
};
