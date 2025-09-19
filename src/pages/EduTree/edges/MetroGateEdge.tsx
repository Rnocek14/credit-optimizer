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
  // Pixel-grid snap helper (halves are crisp too)
  const round = (n: number) => Math.round(n * 2) / 2;

  // If already roughly horizontal, draw a straight line
  if (Math.abs(sy - ty) <= 2) {
    return `M ${round(sx)},${round(sy)} L ${round(tx)},${round(ty)}`;
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
    `M ${round(sx)},${round(sy)}`,                   // start
    `L ${round(elbowX)},${round(elbowY)}`,          // horizontal to elbow
    `Q ${round(elbowX)},${round(elbowY)} ${round(bend1X)},${round(bend1Y)}`, // small round to start radius
    `L ${round(bend2X)},${round(bend2Y)}`,          // tiny vertical to leave corner
    `L ${round(nearTX)},${round(nearTY)}`,          // vertical leg
    `Q ${round(tx)},${round(ty)} ${round(bend3X)},${round(bend3Y)}`,        // rounded into final horizontal
    `L ${round(tx)},${round(ty)}`,                  // final short horizontal into header
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

  // Calculate endpoint label position and zoom-based opacity
  const labelX = targetX - 30;
  const labelY = targetY - 12;
  const endpointLabel = typeof data?.endpointLabel === 'string' ? data.endpointLabel : 
                       typeof data?.label === 'string' ? data.label : null;

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
        stroke="rgba(0,0,0,0)"
        strokeWidth={Math.max(strokeWidth + 12, 20)}
        fill="none"
        vectorEffect="non-scaling-stroke"
        pointerEvents="stroke"
        tabIndex={0}
        aria-label={`Gate to ${data?.label || 'header'} connection`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsHovered(true)}
        onBlur={() => setIsHovered(false)}
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
        vectorEffect="non-scaling-stroke"
        shapeRendering="geometricPrecision"
        strokeLinecap="round"
        strokeLinejoin="round"
        markerEnd={undefined} // No arrowhead - header pill acts as terminator
      />

      {/* SE/DS endpoint label that fades with zoom */}
      {endpointLabel && (
        <foreignObject
          x={labelX - 15}
          y={labelY - 8}
          width="30"
          height="16"
          style={{ 
            pointerEvents: 'none',
            opacity: displayOpacity * 0.8
          }}
        >
          <div 
            style={{
              fontSize: '10px',
              fontWeight: '600',
              color: 'rgba(255,255,255,0.85)',
              textAlign: 'center',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '4px',
              padding: '1px 4px',
              backdropFilter: 'blur(2px)'
            }}
          >
            {endpointLabel}
          </div>
        </foreignObject>
      )}
    </g>
  );
}