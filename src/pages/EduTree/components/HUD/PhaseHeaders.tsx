import React from "react";
import { LAYOUT_CONSTANTS as LC } from "../../utils/layoutConstants";

interface PhaseHeadersProps {
  visible?: boolean;
}

export function PhaseHeaders({ visible = true }: PhaseHeadersProps) {
  if (!visible) return null;

  const phases = [
    { x: LC.YEAR_COLUMNS.Y1, label: "Foundations" },
    { x: LC.YEAR_COLUMNS.Y2, label: "Core" },
    { x: LC.YEAR_COLUMNS.Y3, label: "Specialization" },
    { x: LC.YEAR_COLUMNS.Y4, label: "Capstone" },
  ];

  return (
    <div className="hud__phase-headers">
      {phases.map(({ x, label }) => (
        <div
          key={label}
          className="hud__phase-headers__item"
          style={{ left: x, transform: "translateX(-50%)" }}
        >
          {label}
        </div>
      ))}
    </div>
  );
}