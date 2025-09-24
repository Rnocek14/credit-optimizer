import React from "react";
import { LAYOUT_CONSTANTS as LC } from "../../utils/layoutConstants";
import { type FilterMode } from "../../data/seedDataV2";

interface LaneCaptionsProps {
  filterMode: FilterMode;
  showCS?: boolean;
  showIT?: boolean;
}

export function LaneCaptions({ filterMode, showCS = true, showIT = true }: LaneCaptionsProps) {
  // Only show captions in comparison modes
  if (!filterMode?.startsWith("compare")) return null;

  const items: Array<{ y: number; text: string; color: string }> = [];

  if (showCS) {
    items.push({ 
      y: LC.LANE_ROWS.UP_TRACK_A, 
      text: "CS — Software Engineering",
      color: "blue"
    });
    items.push({ 
      y: LC.LANE_ROWS.UP_TRACK_B, 
      text: "CS — Data Science",
      color: "blue"
    });
  }
  
  if (showIT) {
    items.push({ 
      y: LC.LANE_ROWS.DOWN_CORE, 
      text: "IT Program",
      color: "green"
    });
  }

  return (
    <div className="hud__lane-captions">
      {items.map(({ y, text, color }) => (
        <div 
          key={`${text}-${y}`} 
          className={`hud__lane-captions__item hud__lane-captions__item--${color}`}
          style={{ top: y }}
        >
          {text}
        </div>
      ))}
    </div>
  );
}