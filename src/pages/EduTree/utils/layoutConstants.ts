/**
 * Layout constants for EduTree positioning
 * Separated to avoid circular imports
 * PATCH 7: Fixed overlapping nodes by ensuring unique Y positions for each node
 */

export const LAYOUT_CONSTANTS = {
  YEAR_COLUMNS: { Y1: 200, Y2: 600, Y3: 1300, Y4: 1700 },
  GATE_POSITIONS: { 
    Y1_TO_Y2: 400,  // Program gate after Y1
    Y2_TO_Y3: 900   // Track gate after Y2
  },
  LANE_ROWS: {
    GATE_Y: 360,
    // Upper lane (CS/SE/DS tracks) - sequential with 200px spacing
    UP_CAPSTONE: 60,      // Y4 Capstones start higher
    UP_CAPSTONE_2: 260,   // Second capstone (DS) 
    UP_ELECTIVES: 120,    // Y2 CS Electives
    UP_TRACK_A: 160,      // Y3 SE Core
    UP_TRACK_A_ELEC: 360, // Y3 SE Electives (below SE Core)
    UP_TRACK_B: 80,       // Y3 DS Core  
    UP_TRACK_B_ELEC: 280, // Y3 DS Electives (below DS Core)
    UP_CORE: 240,         // Y2 CS Core
    // Lower lane (IT track) - sequential with 200px spacing
    DOWN_CORE: 460,       // Y2 IT Core
    DOWN_ELECTIVES: 660,  // Y2 IT Electives
    DOWN_CAPSTONE: 560    // Y4 IT Capstone
  }
};