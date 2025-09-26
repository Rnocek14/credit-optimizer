import React from "react";
import { type FilterMode } from "../../data/seedDataV2";

interface ComparisonLegendProps {
  filterMode: FilterMode;
  hasGhostNodes?: boolean;
}

export function ComparisonLegend({ filterMode, hasGhostNodes = false }: ComparisonLegendProps) {
  // Only show legend during comparison modes
  if (!filterMode?.startsWith("compare")) return null;

  return (
    <div className="hud__comparison-legend">
      <div className="hud__legend-title">Legend</div>
      <div className="hud__legend-items">
        <div className="hud__legend-item">
          <div className="hud__legend-dot hud__legend-dot--primary"></div>
          <span>Primary</span>
        </div>
        <div className="hud__legend-item">
          <div className="hud__legend-dot hud__legend-dot--comparison"></div>
          <span>Comparison</span>
        </div>
        <div className="hud__legend-item">
          <div className="hud__legend-dot hud__legend-dot--both"></div>
          <span>Shared</span>
        </div>
        {/* Only show ghost/accelerated legend if ghosts exist */}
        {hasGhostNodes && (
          <div className="hud__legend-item">
            <div className="hud__legend-dot hud__legend-dot--ghost"></div>
            <span>Accelerated</span>
          </div>
        )}
      </div>
    </div>
  );
}