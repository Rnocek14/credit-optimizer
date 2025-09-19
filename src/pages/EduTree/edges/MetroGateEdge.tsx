import * as React from 'react';
import { EdgeProps } from '@xyflow/react';

/**
 * Orthogonal (metro) gate edge:
 *  - Horizontal out of gate (right), rounded elbow, vertical, horizontal into header (left).
 *  - Rounded corner radius with automatic fallback when source/target align.
 */
const R = 12;              // elbow radius
const MIN_H_GAP = 28;      // minimum horizontal run out of the gate before turning
const STROKE = 'rgba(255,255,255,0.88)';

function metroPath(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  r = R,
  minH = MIN_H_GAP
): string {
  // If already roughly horizontal, draw a straight line
  if (Math.abs(sy - ty) <= 2) {
    return `M ${sx},${sy} L ${tx},${ty}`;
  }

  // 1) Go right from source by at least minH (or until halfway)
  const elbowX = Math.max(sx + minH, Math.min(tx - minH, (sx + tx) / 2));
  const elbowY = sy;

  // 2) Rounded elbow: right -> down/up
  const dirY = ty > sy ? 1 : -1; // 1=down, -1=up
  const bend1X = elbowX + r;
  const bend1Y = sy;
  const bend2X = elbowX + r;
  const bend2Y = sy + r * dirY;

  // 3) Vertical leg lands near target Y
  const nearTX = tx - r;
  const nearTY = ty - r * dirY;

  // 4) Rounded elbow: down/up -> right
  const bend3X = tx - r;
  const bend3Y = ty;

  return [
    `M ${sx},${sy}`,                   // start
    `L ${elbowX},${elbowY}`,          // horizontal to elbow
    `Q ${elbowX},${elbowY} ${bend1X},${bend1Y}`, // small round to start radius
    `L ${bend2X},${bend2Y}`,          // tiny vertical to leave corner
    `L ${nearTX},${nearTY}`,          // vertical leg
    `Q ${tx},${ty} ${bend3X},${bend3Y}`,        // rounded into final horizontal
    `L ${tx},${ty}`,                  // final short horizontal into header
  ].join(' ');
}

export default function MetroGateEdge(props: EdgeProps) {
  const {
    id, sourceX, sourceY, targetX, targetY,
    markerEnd, style, selected, data
  } = props;

  // Build once per geometry change
  const d = React.useMemo(
    () => metroPath(sourceX, sourceY, targetX, targetY),
    [sourceX, sourceY, targetX, targetY]
  );

  // Allow outer logic to pass styling via `data` (thickness, dash, opacity)
  const strokeWidth = typeof data?.strokeWidth === 'number' ? data.strokeWidth : 4; // thicker for gates
  const strokeDasharray = typeof data?.strokeDasharray === 'string' ? data.strokeDasharray : undefined;
  const opacity = typeof data?.opacity === 'number' ? data.opacity : 1;

  return (
    <g data-id={id}>
      {/* Wide invisible hitbox for easy hover/selection */}
      <path
        d={d}
        stroke="transparent"
        strokeWidth={Math.max(strokeWidth + 10, 14)}
        fill="none"
      />
      <path
        d={d}
        fill="none"
        stroke={STROKE}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        opacity={opacity}
        shapeRendering="geometricPrecision"
        markerEnd={markerEnd}
      />
      {selected && (
        <path
          d={d}
          fill="none"
          stroke="rgba(180,220,255,0.65)"
          strokeWidth={strokeWidth + 6}
          opacity={0.3}
        />
      )}
    </g>
  );
}