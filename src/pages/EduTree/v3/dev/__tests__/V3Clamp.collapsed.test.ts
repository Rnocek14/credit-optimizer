import { clampCollapsed } from '../V3Clamp';
import type { V3Node, V3Edge, V3Graph, NodeType } from '../../types/v3';

// --- Tokens (must match your layoutTokensV3.ts) ---
const TOKENS = {
  NODE_WIDTH: 232,
  NODE_BASE_HEIGHT: 200,
  NODE_MAX_HEIGHT: 250,
  GATE_HEIGHT: 48,
  LANE_GAP: 70, // stepY = 320 (grid-aligned)
  H_GAP: 24,
  TRACK_COLUMN_OFFSET: 136,
  COL_TOLERANCE: 40,
  REGION_GUTTER: 64,
  TRACK_GUTTER: 16,
  GRID: 8,
  YEAR_COL: { Y1: 300, Y2: 700, Y3: 1100, Y4: 1500 },
} as const;

const snap = (n: number) => Math.round(n / TOKENS.GRID) * TOKENS.GRID;
const stepY = TOKENS.NODE_MAX_HEIGHT + TOKENS.LANE_GAP; // 320 (grid-aligned)
const rowY = (year: 1|2|3|4) => (year - 1) * stepY;      // Y1:0, Y2:320, Y3:640, Y4:960
// Gates centered in gutter: bottom of year row + (gutter - gate height) / 2
const gateY = (year: 1|2) => rowY(year) + TOKENS.NODE_MAX_HEIGHT + (TOKENS.LANE_GAP - TOKENS.GATE_HEIGHT) / 2;

const laneX = (year: 1|2|3|4, track?: 'se'|'ds'|null) => {
  const base = TOKENS.YEAR_COL[`Y${year as 1|2|3|4}`];
  if (!track) return snap(base);
  return snap(track === 'se' ? base - TOKENS.TRACK_COLUMN_OFFSET : base + TOKENS.TRACK_COLUMN_OFFSET);
};

const rectFor = (n: V3Node) => {
  const h = n.type === 'gate' ? TOKENS.GATE_HEIGHT : TOKENS.NODE_MAX_HEIGHT;
  return {
    x1: n.position.x,
    x2: n.position.x + TOKENS.NODE_WIDTH,
    y1: n.position.y,
    y2: n.position.y + h,
  };
};

const intersects = (a: ReturnType<typeof rectFor>, b: ReturnType<typeof rectFor>) =>
  a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;

describe('V3Clamp (collapsed view)', () => {
  test('bundles snap to year rows; gates snap to mid slots; no overlaps', () => {
    // Upstream "bad" positions to simulate engine/collision mistakes
    const nodes: V3Node[] = [
      { id: 'y1-bundle',   type: 'track-bundle', data: { year: 1 },                      position: { x: 1000, y: 77  } },
      { id: 'y2-bundle',   type: 'track-bundle', data: { year: 2 },                      position: { x: 50,   y: 333 } },
      { id: 'y3-se-bundle',type: 'track-bundle', data: { year: 3, trackId: 'se' },       position: { x: 777,  y: 1   } },
      { id: 'y3-ds-bundle',type: 'track-bundle', data: { year: 3, trackId: 'ds' },       position: { x: 12,   y: 999 } },
      { id: 'y4-bundle',   type: 'track-bundle', data: { year: 4 },                      position: { x: 1,    y: 20  } },
      { id: 'program-gate',type: 'gate',         data: { year: 1 },                      position: { x: 0,    y: 0   } },
      { id: 'track-gate',  type: 'gate',         data: { year: 2 },                      position: { x: 0,    y: 0   } },
    ];

    const edges: V3Edge[] = [
      { id: 'e1', kind: 'spine', source: 'y1-bundle',   target: 'program-gate' },
      { id: 'e2', kind: 'gate',  source: 'program-gate', target: 'y2-bundle' },
      { id: 'e3', kind: 'spine', source: 'y2-bundle',    target: 'track-gate' },
      { id: 'e4', kind: 'gate',  source: 'track-gate',   target: 'y3-se-bundle' },
      { id: 'e5', kind: 'gate',  source: 'track-gate',   target: 'y3-ds-bundle' },
      { id: 'e6', kind: 'spine', source: 'y3-se-bundle', target: 'y4-bundle' },
      { id: 'e7', kind: 'spine', source: 'y3-ds-bundle', target: 'y4-bundle' },
    ];

    const clamped = clampCollapsed({ nodes, edges }, TOKENS);
    const byId = new Map(clamped.nodes.map(n => [n.id, n]));

    // --- Expected anchors ---
    expect(byId.get('y1-bundle')!.position).toEqual({ x: laneX(1, null), y: snap(rowY(1)) });
    expect(byId.get('y2-bundle')!.position).toEqual({ x: laneX(2, null), y: snap(rowY(2)) });
    expect(byId.get('y3-se-bundle')!.position).toEqual({ x: laneX(3, 'se'), y: snap(rowY(3)) });
    expect(byId.get('y3-ds-bundle')!.position).toEqual({ x: laneX(3, 'ds'), y: snap(rowY(3)) });
    expect(byId.get('y4-bundle')!.position).toEqual({ x: laneX(4, null), y: snap(rowY(4)) });

    expect(byId.get('program-gate')!.position).toEqual({ x: laneX(1, null), y: snap(gateY(1)) });
    expect(byId.get('track-gate')!.position).toEqual({ x: laneX(2, null), y: snap(gateY(2)) });

    // --- Handle orientations (spine left↔right, gates vertical) ---
    const expectHandles = (id: string, src: string, tgt: string) => {
      const n = byId.get(id)!;
      expect(n.sourcePosition).toBe(src);
      expect(n.targetPosition).toBe(tgt);
    };
    expectHandles('y1-bundle', 'right', 'left');
    expectHandles('y2-bundle', 'right', 'left');
    expectHandles('y3-se-bundle', 'right', 'left');
    expectHandles('y3-ds-bundle', 'right', 'left');
    expectHandles('y4-bundle', 'right', 'left');
    expectHandles('program-gate', 'bottom', 'top');
    expectHandles('track-gate', 'bottom', 'top');

    // --- No overlaps among bundles & gates ---
    const interesting = ['y1-bundle','y2-bundle','y3-se-bundle','y3-ds-bundle','y4-bundle','program-gate','track-gate']
      .map(id => byId.get(id)!);
    for (let i = 0; i < interesting.length; i++) {
      for (let j = i + 1; j < interesting.length; j++) {
        const A = rectFor(interesting[i]);
        const B = rectFor(interesting[j]);
        const collide = intersects(A, B);
        if (collide) {
          // useful message if failed
          console.table({ A: interesting[i], B: interesting[j], Arect: A, Brect: B });
        }
        expect(collide).toBe(false);
      }
    }

    // --- Spine direction guards: all spine edges should go Y↑ (src < tgt) ---
    const yearOf = (id: string) => (byId.get(id)?.data?.year ?? 0) as number;
    const spine = clamped.edges.filter(e => e.kind === 'spine');
    spine.forEach(e => {
      expect(yearOf(e.source)).toBeLessThan(yearOf(e.target));
    });
  });

  test('does not disturb requirement nodes except snapping X to lane and Y to grid', () => {
    const nodes: V3Node[] = [
      // expanded requirements mixed with bundles/gates
      { id: 'y3-se-req1', type: 'requirement', data: { year: 3, trackId: 'se' }, position: { x: 902, y: 650.7 } },
      { id: 'y3-ds-req1', type: 'requirement', data: { year: 3, trackId: 'ds' }, position: { x: 1093, y: 658.2 } },
      { id: 'y3-se-bundle', type: 'track-bundle', data: { year: 3, trackId: 'se' }, position: { x: 0, y: 0 } },
      { id: 'track-gate', type: 'gate', data: { year: 2 }, position: { x: 0, y: 0 } },
    ];
    const clamped = clampCollapsed({ nodes, edges: [] }, TOKENS);

    const seReq = clamped.nodes.find(n => n.id === 'y3-se-req1')!;
    const dsReq = clamped.nodes.find(n => n.id === 'y3-ds-req1')!;

    // X snapped to lane centers
    expect(seReq.position.x).toBe(laneX(3, 'se'));
    expect(dsReq.position.x).toBe(laneX(3, 'ds'));

    // Y snapped to grid (but NOT forced to row center)
    expect(seReq.position.y % TOKENS.GRID).toBe(0);
    expect(dsReq.position.y % TOKENS.GRID).toBe(0);

    // Bundle & gate were clamped as usual
    const bundle = clamped.nodes.find(n => n.id === 'y3-se-bundle')!;
    const gate = clamped.nodes.find(n => n.id === 'track-gate')!;
    expect(bundle.position).toEqual({ x: laneX(3, 'se'), y: snap(rowY(3)) });
    expect(gate.position).toEqual({ x: laneX(2, null), y: snap(gateY(2)) });
  });
});
