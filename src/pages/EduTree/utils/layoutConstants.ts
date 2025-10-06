/**
 * Layout constants for EduTree positioning
 * Separated to avoid circular imports
 * PATCH 8: Increased vertical spacing to prevent overlaps with expanded course lists
 */

export const LAYOUT_CONSTANTS = {
  YEAR_COLUMNS: { Y1: 200, Y2: 600, Y3: 1300, Y4: 1700 },
  GATE_POSITIONS: { 
    Y1_TO_Y2: 400,  // Program gate after Y1
    Y2_TO_Y3: 900   // Track gate after Y2
  },
  LANE_ROWS: {
    GATE_Y: 360,
    // Upper lane (CS/SE/DS tracks) - increased spacing to 250px for expanded nodes
    UP_ELECTIVES: 80,     // Y2 CS Electives (moved higher)
    UP_CORE: 330,         // Y2 CS Core (250px below Electives)
    UP_TRACK_A: 120,      // Y3 SE Core
    UP_TRACK_A_ELEC: 370, // Y3 SE Electives (250px below SE Core)
    UP_TRACK_B: 40,       // Y3 DS Core (moved higher)
    UP_TRACK_B_ELEC: 290, // Y3 DS Electives (250px below DS Core)
    UP_CAPSTONE: 50,      // Y4 SE Capstone
    UP_CAPSTONE_2: 300,   // Y4 DS Capstone (250px below SE)
    // Lower lane (IT track) - increased spacing to 250px
    DOWN_CORE: 460,       // Y2 IT Core
    DOWN_ELECTIVES: 710,  // Y2 IT Electives (250px below Core)
    DOWN_CAPSTONE: 580    // Y4 IT Capstone
  }
};