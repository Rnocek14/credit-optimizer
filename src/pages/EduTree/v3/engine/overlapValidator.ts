import { V3Node } from '../types/v3';

export interface OverlapDiagnostic {
  a: string;
  b: string;
  aX: [number, number];
  bX: [number, number];
  aY: [number, number];
  bY: [number, number];
  yearA: number | undefined;
  yearB: number | undefined;
  programA: string | undefined;
  programB: string | undefined;
  laneA: 'any' | 'se' | 'ds';
  laneB: 'any' | 'se' | 'ds';
  laneCenterA: number;
  laneCenterB: number;
  xDrift: boolean;
  tooNarrowLanes: boolean;
  tooShortStepY: boolean;
  gateXNotCenter: boolean;
  missingYearOrProgram: boolean;
  horizontalGap: number;
  verticalGap: number;
}

function getLane(node: V3Node): 'any' | 'se' | 'ds' {
  if (node.type === 'gate' || !node.data.trackId) return 'any';
  return node.data.trackId as 'se' | 'ds';
}

function getLaneCenter(node: V3Node, yearCol: number, offset: number, grid: number): number {
  const lane = getLane(node);
  const snap = (n: number) => Math.round(n / grid) * grid;
  if (lane === 'se') return snap(yearCol - offset);
  if (lane === 'ds') return snap(yearCol + offset);
  return snap(yearCol);
}

export function validateNoOverlaps(
  nodes: V3Node[],
  t: typeof import('../utils/layoutTokensV3').LAYOUT_TOKENS
): { hasOverlaps: boolean; overlaps: Array<{ a: string; b: string }>; diagnostics: OverlapDiagnostic[] } {
  const overlaps: Array<{ a: string; b: string }> = [];
  const diagnostics: OverlapDiagnostic[] = [];
  
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const A = nodes[i], B = nodes[j];
      const xOverlap = !(A.position.x + t.NODE_WIDTH <= B.position.x ||
                         B.position.x + t.NODE_WIDTH <= A.position.x);
      const yOverlap = !(A.position.y + t.NODE_MAX_HEIGHT <= B.position.y ||
                         B.position.y + t.NODE_MAX_HEIGHT <= A.position.y);
      
      if (xOverlap && yOverlap) {
        overlaps.push({ a: A.id, b: B.id });
        
        // Compute diagnostic info
        const yearColA = (t.YEAR_COL as any)[`Y${A.data.year || 1}`] ?? t.YEAR_COL.Y1;
        const yearColB = (t.YEAR_COL as any)[`Y${B.data.year || 1}`] ?? t.YEAR_COL.Y1;
        const laneCenterA = getLaneCenter(A, yearColA, t.TRACK_COLUMN_OFFSET, t.GRID);
        const laneCenterB = getLaneCenter(B, yearColB, t.TRACK_COLUMN_OFFSET, t.GRID);
        
        const xDriftA = Math.abs(A.position.x - laneCenterA) > t.GRID / 2;
        const xDriftB = Math.abs(B.position.x - laneCenterB) > t.GRID / 2;
        
        const horizontalGap = Math.min(
          Math.abs(A.position.x - (B.position.x + t.NODE_WIDTH)),
          Math.abs(B.position.x - (A.position.x + t.NODE_WIDTH))
        );
        
        const verticalGap = Math.min(
          Math.abs(A.position.y - (B.position.y + t.NODE_MAX_HEIGHT)),
          Math.abs(B.position.y - (A.position.y + t.NODE_MAX_HEIGHT))
        );
        
        diagnostics.push({
          a: A.id,
          b: B.id,
          aX: [A.position.x, A.position.x + t.NODE_WIDTH],
          bX: [B.position.x, B.position.x + t.NODE_WIDTH],
          aY: [A.position.y, A.position.y + t.NODE_MAX_HEIGHT],
          bY: [B.position.y, B.position.y + t.NODE_MAX_HEIGHT],
          yearA: A.data.year,
          yearB: B.data.year,
          programA: A.data.programId,
          programB: B.data.programId,
          laneA: getLane(A),
          laneB: getLane(B),
          laneCenterA,
          laneCenterB,
          xDrift: xDriftA || xDriftB,
          tooNarrowLanes: horizontalGap < t.H_GAP,
          tooShortStepY: verticalGap < t.LANE_GAP,
          gateXNotCenter: (A.type === 'gate' && xDriftA) || (B.type === 'gate' && xDriftB),
          missingYearOrProgram: !A.data.year || !A.data.programId || !B.data.year || !B.data.programId,
          horizontalGap,
          verticalGap
        });
      }
    }
  }
  
  return { hasOverlaps: overlaps.length > 0, overlaps, diagnostics };
}
