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
  t: typeof import('../utils/layoutTokensV3').LAYOUT_TOKENS | typeof import('../utils/layoutTokensVertical').VERT
): { hasOverlaps: boolean; overlaps: Array<{ a: string; b: string }>; diagnostics: OverlapDiagnostic[] } {
  const overlaps: Array<{ a: string; b: string }> = [];
  const diagnostics: OverlapDiagnostic[] = [];
  
  // Helper to get per-type heights (handle both token sets)
  const getHeight = (node: V3Node) => {
    if (node.type === 'gate') return t.GATE_HEIGHT;
    // VERT uses NODE_HEIGHT, LAYOUT_TOKENS uses NODE_MAX_HEIGHT
    return 'NODE_HEIGHT' in t ? t.NODE_HEIGHT : (t as any).NODE_MAX_HEIGHT;
  };
  
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const A = nodes[i], B = nodes[j];
      const heightA = getHeight(A);
      const heightB = getHeight(B);
      
      const xOverlap = !(A.position.x + t.NODE_WIDTH <= B.position.x ||
                         B.position.x + t.NODE_WIDTH <= A.position.x);
      const yOverlap = !(A.position.y + heightA <= B.position.y ||
                         B.position.y + heightB <= A.position.y);
      
      if (xOverlap && yOverlap) {
        overlaps.push({ a: A.id, b: B.id });
        
        // Compute diagnostic info (only for horizontal layout with YEAR_COL)
        const hasYearCol = 'YEAR_COL' in t;
        const yearColA = hasYearCol ? ((t as any).YEAR_COL as any)[`Y${A.data.year || 1}`] ?? (t as any).YEAR_COL.Y1 : 0;
        const yearColB = hasYearCol ? ((t as any).YEAR_COL as any)[`Y${B.data.year || 1}`] ?? (t as any).YEAR_COL.Y1 : 0;
        const trackOffset = 'TRACK_COLUMN_OFFSET' in t ? (t as any).TRACK_COLUMN_OFFSET : 0;
        const laneCenterA = getLaneCenter(A, yearColA, trackOffset, t.GRID);
        const laneCenterB = getLaneCenter(B, yearColB, trackOffset, t.GRID);
        
        const xDriftA = Math.abs(A.position.x - laneCenterA) > t.GRID / 2;
        const xDriftB = Math.abs(B.position.x - laneCenterB) > t.GRID / 2;
        
        const heightA = getHeight(A);
        const heightB = getHeight(B);
        
        const horizontalGap = Math.min(
          Math.abs(A.position.x - (B.position.x + t.NODE_WIDTH)),
          Math.abs(B.position.x - (A.position.x + t.NODE_WIDTH))
        );
        
        const verticalGap = Math.min(
          Math.abs(A.position.y - (B.position.y + heightA)),
          Math.abs(B.position.y - (A.position.y + heightB))
        );
        
        diagnostics.push({
          a: A.id,
          b: B.id,
          aX: [A.position.x, A.position.x + t.NODE_WIDTH],
          bX: [B.position.x, B.position.x + t.NODE_WIDTH],
          aY: [A.position.y, A.position.y + heightA],
          bY: [B.position.y, B.position.y + heightB],
          yearA: A.data.year,
          yearB: B.data.year,
          programA: A.data.programId,
          programB: B.data.programId,
          laneA: getLane(A),
          laneB: getLane(B),
          laneCenterA,
          laneCenterB,
          xDrift: xDriftA || xDriftB,
          tooNarrowLanes: horizontalGap < ('H_GAP' in t ? (t as any).H_GAP : 24),
          tooShortStepY: verticalGap < ('LANE_GAP' in t ? (t as any).LANE_GAP : ('VERTICAL_GAP' in t ? t.VERTICAL_GAP : 80)),
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
