import * as React from 'react';
import { EdgeProps } from '@xyflow/react';

/**
 * Orthogonal (metro) gate edge:
 *  - Horizontal out of gate (right), rounded elbow, vertical, horizontal into header (left).
 *  - Rounded corner radius with automatic fallback when source/target align.
 */
const R = 12;              // elbow radius
const MIN_H_GAP = 36;      // minimum horizontal run out of the gate before turning (increased for cleaner look)
const STROKE = 'rgba(255,255,255,0.92)'; // Slightly brighter for gate edges

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

  // Clamp radius to available space to prevent over-rounding on short runs
  const dx = Math.abs(tx - sx);
  const dy = Math.abs(ty - sy);
  const effectiveRadius = Math.min(r, Math.max(6, dx / 4), Math.max(6, dy / 4));

  // 2) Rounded elbow: right -> down/up
  const dirY = ty > sy ? 1 : -1; // 1=down, -1=up
  const bend1X = elbowX + effectiveRadius;
  const bend1Y = sy;
  const bend2X = elbowX + effectiveRadius;
  const bend2Y = sy + effectiveRadius * dirY;

  // 3) Vertical leg lands near target Y
  const nearTX = tx - effectiveRadius;
  const nearTY = ty - effectiveRadius * dirY;

  // 4) Rounded elbow: down/up -> right
  const bend3X = tx - effectiveRadius;
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

export default function MetroGateEdge({
  id, sourceX, sourceY, targetX, targetY,
  markerEnd, selected, data,
}: EdgeProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  
  const d = React.useMemo(
    () => metroPath(sourceX, sourceY, targetX, targetY),
    [sourceX, sourceY, targetX, targetY]
  );

  // Allow outer logic to pass styling via `data` (thickness, dash, opacity)
  const strokeWidth = typeof data?.strokeWidth === 'number' ? data.strokeWidth : 5; // thicker for gates (5px vs 2px for prereqs)
  const strokeDasharray = typeof data?.strokeDasharray === 'string' ? data.strokeDasharray : undefined;
  const opacity = typeof data?.opacity === 'number' ? data.opacity : 1;

  // Enhanced opacity and glow for hover state
  const displayOpacity = isHovered ? Math.min(opacity + 0.3, 1) : opacity;

  return (
    <g data-id={id}>
      {/* Wide invisible hitbox for easy hover/selection */}
      <path
        d={d}
        stroke="transparent"
        strokeWidth={Math.max(strokeWidth + 12, 16)}
        fill="none"
        vectorEffect="non-scaling-stroke"
        pointerEvents="stroke"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ cursor: 'pointer' }}
      />
      
      {/* Subtle glow for hover state */}
      {isHovered && (
        <path
          d={d}
          fill="none"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth={strokeWidth + 4}
          opacity={0.4}
          shapeRendering="geometricPrecision"
        />
      )}
      
      {/* Enhanced glow for selected state */}
      {selected && (
        <path
          d={d}
          fill="none"
          stroke="rgba(180,220,255,0.4)"
          strokeWidth={strokeWidth + 8}
          opacity={0.6}
          shapeRendering="geometricPrecision"
        />
      )}
      
      {/* Main visible stroke */}
      <path
        d={d}
        fill="none"
        stroke={STROKE}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        opacity={displayOpacity}
        shapeRendering="geometricPrecision"
        strokeLinecap="round"
        strokeLinejoin="round"
        markerEnd={undefined} // No arrowhead - header pill acts as terminator
      />
    </g>
  );
}