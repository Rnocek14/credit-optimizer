/* ======================================================================
 * V3 Mega-Debugger — zero-deps, copy/paste
 * Exposes window.__V3DBG with:
 *   - hook({ calculateLayout, resolveCollisions, build })
 *   - afterRender({ nodes, edges }, tokens)
 *   - assert.all(), assert.rows(), assert.columns(), assert.edges(), assert.noOverlaps()
 *   - dom.measureWidths(), dom.nodes()
 *   - perf.withTiming(label, fn)
 *   - snap.save(), snap.diff()
 *   - config flags + HUD (press Shift+D to toggle)
 * ====================================================================== */

type Id = string;

type V3Node = {
  id: Id;
  type: 'track-bundle' | 'requirement' | 'gate' | string;
  data: any;
  position: { x: number; y: number };
  width?: number;    // optional (ReactFlow usually manages)
  height?: number;   // optional
  sourcePosition?: any;
  targetPosition?: any;
};

type V3Edge = {
  id: Id;
  source: Id;
  target: Id;
  kind?: 'spine' | 'gate' | string;
};

type V3Graph = { nodes: V3Node[]; edges: V3Edge[] };

type Tokens = {
  NODE_WIDTH: number;
  NODE_BASE_HEIGHT: number;
  NODE_MAX_HEIGHT: number;
  GATE_HEIGHT: number;
  LANE_GAP: number;
  H_GAP: number;
  TRACK_COLUMN_OFFSET: number;
  COL_TOLERANCE: number;
  REGION_GUTTER: number;
  TRACK_GUTTER: number;
  GRID: number;
  YEAR_COL: { Y1: number; Y2: number; Y3: number; Y4: number };
};

// ---------- helpers ----------
const json = (x: any) => JSON.stringify(x, null, 2);
const gridSnap = (n: number, g: number) => Math.round(n / g) * g;
const hash = (obj: any) => {
  const s = typeof obj === 'string' ? obj : JSON.stringify(obj);
  let h = 0, i = 0, len = s.length;
  while (i < len) { h = (h << 5) - h + s.charCodeAt(i++) | 0; }
  return (h >>> 0).toString(16);
};
const byId = <T extends { id: Id }>(arr: T[]) => new Map(arr.map(x => [x.id, x]));

// ---------- state ----------
const state = {
  lastSnap: null as null | { nodes: V3Node[]; edges: V3Edge[]; when: number; checksum: string },
  tokens: null as Tokens | null,
  hudEl: null as HTMLElement | null,
  enabledHUD: false,
  config: {
    failFast: true,
    logTables: true,
    showOverlaps: true,
  }
};

// ---------- core validators ----------
function stepY(t: Tokens) { return t.NODE_MAX_HEIGHT + t.LANE_GAP; }
function yearRow(y: 1|2|3|4, t: Tokens) { return (y - 1) * stepY(t); }
function gateSlot(y: 1|2|3|4, t: Tokens) { return yearRow(y, t) + stepY(t)/2; }

function assertRows(nodes: V3Node[], t: Tokens) {
  const g = t.GRID, sy = stepY(t);
  let bad = [] as any[];
  for (const n of nodes) {
    if (n.type !== 'track-bundle') continue;
    const yr = (n.data?.year ?? 1) as 1|2|3|4;
    const exp = yearRow(yr, t);
    const drift = Math.abs(n.position.y - exp);
    if (drift > g) bad.push({ id: n.id, type: n.type, year: yr, y: n.position.y, exp, drift });
  }
  if (bad.length) {
    console.groupCollapsed('❌ Row misalignments');
    console.table(bad);
    console.groupEnd();
    if (state.config.failFast) throw new Error('Row alignment failed');
  } else {
    console.info('✅ Rows OK (bundles at Y rows sy=', sy, ')');
  }
}

function assertGateSlots(nodes: V3Node[], t: Tokens) {
  const g = t.GRID;
  let bad:any[] = [];
  for (const n of nodes) {
    if (n.type !== 'gate' && !String(n.id).includes('gate')) continue;
    const yr = (n.data?.year ?? 1) as 1|2|3|4;
    const exp = gateSlot(yr, t);
    const drift = Math.abs(n.position.y - exp);
    if (drift > g) bad.push({ id:n.id, year: yr, y:n.position.y, exp, drift });
  }
  if (bad.length) {
    console.groupCollapsed('❌ Gate slot misalignments');
    console.table(bad);
    console.groupEnd();
    if (state.config.failFast) throw new Error('Gate slot failed');
  } else {
    console.info('✅ Gate slots OK');
  }
}

function assertColumns(nodes: V3Node[], t: Tokens) {
  const snap = (v:number)=> gridSnap(v,t.GRID);
  const bad:any[] = [];
  nodes.forEach(n => {
    const y = (n.data?.year ?? 1) as 1|2|3|4;
    const base = (t.YEAR_COL as any)[`Y${y}`] ?? t.YEAR_COL.Y1;
    const exp =
      (n.type === 'gate' || !n.data?.trackId) ? snap(base) :
      n.data.trackId === 'se' ? snap(base - t.TRACK_COLUMN_OFFSET) :
      snap(base + t.TRACK_COLUMN_OFFSET);
    const drift = Math.abs(n.position.x - exp);
    if (drift > t.GRID) bad.push({ id:n.id, type:n.type, lane:n.data?.trackId ?? 'any', x:n.position.x, exp, drift });
  });
  if (bad.length) {
    console.groupCollapsed('❌ Column misalignments');
    console.table(bad);
    console.groupEnd();
    if (state.config.failFast) throw new Error('Column alignment failed');
  } else {
    console.info('✅ Column centers OK');
  }
}

function detectOverlaps(nodes: V3Node[], t: Tokens) {
  const W = t.NODE_WIDTH;
  const boxes = nodes.map(n => ({
    id: n.id,
    type: n.type,
    x: n.position.x,
    y: n.position.y,
    w: W,
    h: n.type === 'gate' ? t.GATE_HEIGHT : t.NODE_MAX_HEIGHT
  }));
  const overlaps: any[] = [];
  let minGap = Infinity;
  
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      const xOver = !(a.x + a.w <= b.x || b.x + b.w <= a.x);
      const yOver = !(a.y + a.h <= b.y || b.y + b.h <= a.y);
      
      // Calculate gaps
      const xGap = Math.min(
        Math.abs(a.x - (b.x + b.w)),
        Math.abs(b.x - (a.x + a.w))
      );
      const yGap = Math.min(
        Math.abs(a.y - (b.y + b.h)),
        Math.abs(b.y - (a.y + a.h))
      );
      const gap = Math.min(xGap, yGap);
      if (gap < minGap) minGap = gap;
      
      if (xOver && yOver) overlaps.push({ A: a.id, B: b.id });
    }
  }
  
  return { overlaps, minGap: minGap === Infinity ? 0 : minGap };
}

function assertNoOverlaps(nodes: V3Node[], t: Tokens) {
  const { overlaps } = detectOverlaps(nodes, t);
  if (overlaps.length) {
    console.groupCollapsed(`❌ Overlaps: ${overlaps.length}`);
    console.table(overlaps);
    console.groupEnd();
    if (state.config.failFast) throw new Error('Overlaps detected');
  } else {
    console.info('✅ No overlaps');
  }
}

function assertEdges(graph: V3Graph, nodes: V3Node[]) {
  const m = byId(nodes);
  const bad:any[] = [];
  for (const e of graph.edges) {
    if (e.kind === 'spine') {
      const s = m.get(e.source), t = m.get(e.target);
      const sy = s?.data?.year ?? 0, ty = t?.data?.year ?? 99;
      if (!(sy < ty)) bad.push({ id:e.id, src:e.source, tgt:e.target, sy, ty });
    }
  }
  if (bad.length) {
    console.groupCollapsed('❌ Spine direction violations');
    console.table(bad);
    console.groupEnd();
    if (state.config.failFast) throw new Error('Spine direction invalid');
  } else {
    console.info('✅ Spine direction OK');
  }
}

// ---------- DOM probes ----------
const dom = {
  nodes: () => [...document.querySelectorAll<HTMLElement>('.react-flow__node')],
  
  getRFZoom: () => {
    const vp = document.querySelector<HTMLElement>('.react-flow__viewport');
    if (!vp) return 1;
    // Expect transform like: matrix(a,b,c,d,tx,ty)
    const m = getComputedStyle(vp).transform;
    if (!m || m === 'none') return 1;
    const match = m.match(/matrix\(([^,]+)/);
    if (!match) return 1;
    const a = Number(match[1].trim());
    return isFinite(a) && a > 0 ? a : 1;
  },
  
  probeComputedWidth: (el: HTMLElement) => {
    // Try to find a stable inner container to check computed width
    const inner = el.querySelector<HTMLElement>('[data-v3-node-body], .v3-node-body, .card, [data-rf-nodetype]');
    if (!inner) return null;
    const cs = getComputedStyle(inner);
    const px = parseFloat(cs.width);
    return Number.isFinite(px) ? Math.round(px) : null;
  },
  
  measureWidths: () => {
    const zoom = dom.getRFZoom();
    const rows = dom.nodes().map(el => {
      const rect = el.getBoundingClientRect();
      // Unscale back to graph CSS pixels
      const w = Math.round(rect.width / zoom);
      const h = Math.round(rect.height / zoom);
      const cw = dom.probeComputedWidth(el);
      return { id: el.dataset.id || '(unknown)', w, h, cw };
    });
    const widths = rows.map(r => r.w);
    const min = Math.min(...widths), max = Math.max(...widths);
    const avg = Math.round(widths.reduce((a,b)=>a+b,0)/Math.max(1,widths.length));
    console.table(rows);
    console.log('DOM Widths (unscaled) → min:',min,' avg:',avg,' max:',max,' zoom:',zoom.toFixed(3));
    return { rows, min, avg, max, zoom };
  }
};

// ---------- perf ----------
const perf = {
  withTiming<T>(label: string, fn: ()=>T): T {
    const t0 = performance.now();
    const out = fn();
    const t1 = performance.now();
    console.log(`⏱ ${label}: ${(t1 - t0).toFixed(2)} ms`);
    return out;
  }
};

// ---------- snapshots ----------
const snap = {
  save(graph: V3Graph) {
    state.lastSnap = {
      nodes: graph.nodes.map(n=>({id:n.id,type:n.type,data:{year:n.data?.year,trackId:n.data?.trackId},position:{...n.position}})),
      edges: graph.edges.map(e=>({id:e.id,source:e.source,target:e.target,kind:e.kind})),
      when: Date.now(),
      checksum: hash(graph)
    };
    console.log('💾 snapshot saved:', state.lastSnap?.checksum);
  },
  diff(graph: V3Graph) {
    if (!state.lastSnap) { console.warn('No prior snapshot. Call snap.save()'); return; }
    const prev = byId(state.lastSnap.nodes);
    const now = byId(graph.nodes);
    const moved:any[] = [];
    prev.forEach((pn, id) => {
      const nn = now.get(id);
      if (!nn) return;
      const dx = nn.position.x - pn.position.x;
      const dy = nn.position.y - pn.position.y;
      if (dx || dy) moved.push({ id, dx, dy, from:pn.position, to:nn.position });
    });
    console.table(moved);
    console.log('Δ checksum:', state.lastSnap.checksum, '→', hash(graph));
    return moved;
  }
};

// ---------- HUD ----------
function ensureHUD() {
  if (state.hudEl) return state.hudEl;
  const el = document.createElement('div');
  el.style.cssText = `
    position: fixed; right: 12px; bottom: 12px; z-index: 99999;
    background: rgba(0,0,0,.6); color: #fff; padding: 10px 12px;
    border-radius: 10px; font: 12px/1.4 ui-monospace, monospace;
    box-shadow: 0 6px 16px rgba(0,0,0,.3);
  `;
  el.innerHTML = `
    <div style="opacity:.85">V3 HUD</div>
    <div id="v3hud-body"></div>
    <div style="margin-top:6px;opacity:.6">Shift+D toggle • Shift+O overlaps • Shift+M measure • Shift+C copy report</div>
  `;
  document.body.appendChild(el);
  state.hudEl = el;
  return el;
}

function updateHUD(graph: V3Graph, t: Tokens) {
  if (!state.enabledHUD) return;
  const body = ensureHUD().querySelector('#v3hud-body') as HTMLElement;
  const sy = stepY(t);
  const rows = graph.nodes.filter(n=>n.type==='track-bundle')
    .map(n => `Y${n.data?.year}: ${n.position.y}`);
  body.innerHTML = `
    nodes: ${graph.nodes.length} • edges: ${graph.edges.length}<br/>
    stepY: ${sy} • width: ${t.NODE_WIDTH}<br/>
    rows: ${rows.join(' | ')}
  `;
}

function installKeybinds(graphGetter: ()=>V3Graph | null, tokensGetter: ()=>Tokens | null) {
  window.addEventListener('keydown', (e) => {
    if (!e.shiftKey) return;
    const g = graphGetter(); const t = tokensGetter();
    if (!g || !t) return;
    if (e.key.toLowerCase()==='d') {
      state.enabledHUD = !state.enabledHUD;
      if (!state.enabledHUD && state.hudEl) state.hudEl.remove();
      else updateHUD(g, t);
    }
    if (e.key.toLowerCase()==='o') assertNoOverlaps(g.nodes, t);
    if (e.key.toLowerCase()==='m') dom.measureWidths();
    if (e.key.toLowerCase()==='c') {
      const report = generateReport(g, t);
      if (navigator.clipboard) {
        navigator.clipboard.writeText(report).then(() => {
          console.log('📋 Report copied to clipboard!');
        });
      }
      console.log(report);
    }
  });
}

// ---------- wrappers ----------
function wrapCalculateLayout(fn: (nodes:V3Node[], t:Tokens)=>V3Node[]) {
  return (nodes:V3Node[], t:Tokens) => {
    const out = perf.withTiming('calculateLayout', () => fn(nodes, t));
    if (state.config.logTables) {
      console.table(out.map(n=>({id:n.id,type:n.type,year:n.data?.year,lane:n.data?.trackId??'any',x:n.position.x,y:n.position.y})));
    }
    return out;
  };
}

function wrapResolveCollisions(fn: (nodes:V3Node[], regions:any, t:Tokens)=>V3Node[]) {
  return (nodes:V3Node[], regions:any, t:Tokens) => {
    const before = nodes.filter(n=>n.type==='track-bundle'||n.type==='gate')
      .map(n=>({id:n.id,y:n.position.y}));
    const out = perf.withTiming('resolveCollisions', () => fn(nodes, regions, t));
    const after = out.filter(n=>n.type==='track-bundle'||n.type==='gate')
      .map(n=>({id:n.id,y:n.position.y}));
    console.groupCollapsed('↔ resolver diff (bundles & gates)');
    console.table(before.map((b,i)=> ({ id:b.id, y_before:b.y, y_after: after[i]?.y })));
    console.groupEnd();
    return out;
  };
}

function wrapBuild(fn: (g:V3Graph)=>{ graph:V3Graph, metrics?:any }) {
  return (g:V3Graph) => {
    const out = perf.withTiming('buildEduTreeGraph', () => fn(g));
    return out;
  };
}

// ---------- copyable report ----------
function generateReport(graph: V3Graph, tokens: Tokens): string {
  const sy = stepY(tokens);
  const { overlaps, minGap } = detectOverlaps(graph.nodes, tokens);
  const widths = dom.measureWidths();
  
  // 1. DOM vs Token Width Strict Check (using unscaled widths)
  const strictWidthOK =
    Math.abs(widths.avg - tokens.NODE_WIDTH) <= 1 &&
    widths.max <= tokens.NODE_WIDTH &&
    widths.min >= tokens.NODE_WIDTH - 1;
  const widthStatus = strictWidthOK
    ? '✅ DOM width matches NODE_WIDTH'
    : `❌ DOM width drift: avg=${widths.avg}, min=${widths.min}, max=${widths.max}, token=${tokens.NODE_WIDTH}`;
  
  const computedWidthStatus = widths.rows.some(r => r.cw && Math.abs(r.cw - tokens.NODE_WIDTH) > 1)
    ? '❌ Some computed widths != NODE_WIDTH'
    : '✅ Computed widths match NODE_WIDTH (if probed)';
  
  // 2. Column Drift Table
  const snap = (v: number) => gridSnap(v, tokens.GRID);
  const expectedX = (n: V3Node) => {
    const y = (n.data?.year ?? 1) as 1 | 2 | 3 | 4;
    const base = (tokens.YEAR_COL as any)[`Y${y}`] ?? tokens.YEAR_COL.Y1;
    return snap(
      n.type === 'gate' || !n.data?.trackId
        ? base
        : n.data.trackId === 'se'
        ? base - tokens.TRACK_COLUMN_OFFSET
        : base + tokens.TRACK_COLUMN_OFFSET
    );
  };
  
  const colDriftRows = graph.nodes.map(n => {
    const exp = expectedX(n);
    const drift = Math.abs(n.position.x - exp);
    return `  ${n.id.padEnd(20)} x:${String(n.position.x).padStart(5)} | expected:${String(exp).padStart(5)} | drift:${String(drift).padStart(2)} ${drift <= tokens.GRID ? '✅' : '❌'}`;
  }).join('\n');
  
  // 3. Grid Compliance
  const offGrid = graph.nodes.filter(n => 
    (n.position.x % tokens.GRID) !== 0 || (n.position.y % tokens.GRID) !== 0
  );
  const gridSummary = `Grid compliance: ${graph.nodes.length - offGrid.length}/${graph.nodes.length} nodes on-grid${
    offGrid.length ? ` • Off-grid: ${offGrid.map(n => n.id).join(', ')}` : ''
  }`;
  
  // 4. Edge Kind Distribution + Direction Matrix
  const kinds = graph.edges.reduce((a, e) => {
    const k = e.kind || 'unknown';
    a[k] = (a[k] || 0) + 1;
    return a;
  }, {} as Record<string, number>);
  
  const yearOf = (id: string) => (graph.nodes.find(n => n.id === id)?.data?.year ?? 0) as number;
  const spine = graph.edges.filter(e => e.kind === 'spine');
  const dirRows = spine.map(e => {
    const sy = yearOf(e.source), ty = yearOf(e.target);
    const ok = sy < ty ? '✅' : '❌';
    return `  ${e.id.padEnd(30)} Y${sy}→Y${ty} ${ok}`;
  }).join('\n');
  
  // 5. Resolver/Clamp Impact
  const lastSnap = state.lastSnap;
  let resolverSummary = '(No prior snapshot)';
  if (lastSnap) {
    const prevMap = byId(lastSnap.nodes);
    const moved = graph.nodes
      .filter(n => n.type === 'track-bundle' || n.type === 'gate')
      .map(n => {
        const prev = prevMap.get(n.id);
        if (!prev) return null;
        const dx = n.position.x - prev.position.x;
        const dy = n.position.y - prev.position.y;
        return dx || dy ? { id: n.id, dx, dy } : null;
      })
      .filter(Boolean);
    
    resolverSummary = moved.length
      ? `❌ Resolver/clamp moved ${moved.length} immutable nodes:\n${moved.map((m: any) => `  ${m.id}: Δx=${m.dx}, Δy=${m.dy}`).join('\n')}`
      : '✅ Resolver/clamp did not move bundles or gates';
  }
  
  // 6. Handle Orientation Audit
  const handleRow = (n: V3Node) => {
    const expect = n.type === 'gate' ? 'bottom→top' : 'right→left';
    const has = `${n.sourcePosition || '-'}→${n.targetPosition || '-'}`;
    const ok = has === expect ? '✅' : '❌';
    return `  ${n.id.padEnd(20)} ${has.padEnd(11)} expected ${expect.padEnd(11)} ${ok}`;
  };
  
  const handlesAudit = graph.nodes
    .filter(n => n.type === 'gate' || n.type === 'track-bundle')
    .map(handleRow)
    .join('\n');
  
  // 7. Token Consistency Hash
  const tokenHash = hash(tokens);
  const ua = navigator.userAgent.slice(0, 60);
  const dpr = window.devicePixelRatio || 1;
  
  const bundles = graph.nodes.filter(n => n.type === 'track-bundle');
  const gates = graph.nodes.filter(n => n.type === 'gate' || String(n.id).includes('gate'));
  
  const nodeTable = graph.nodes.map(n => 
    `${n.id.padEnd(20)} | ${n.type.padEnd(15)} | Y${n.data?.year || '-'} | ${(n.data?.trackId || 'any').padEnd(4)} | x:${n.position.x.toString().padStart(5)} y:${n.position.y.toString().padStart(5)} | ${n.sourcePosition || '-'}→${n.targetPosition || '-'}`
  ).join('\n');
  
  const edgeTable = graph.edges.map(e => {
    const src = graph.nodes.find(n => n.id === e.source);
    const tgt = graph.nodes.find(n => n.id === e.target);
    const sy = src?.data?.year ?? 0;
    const ty = tgt?.data?.year ?? 99;
    const ok = e.kind === 'spine' ? (sy < ty ? '✅' : '❌') : e.kind === 'gate' ? '✅' : '-';
    return `${e.id.padEnd(30)} | ${(e.kind || '-').padEnd(6)} | ${e.source.padEnd(20)} → ${e.target.padEnd(20)} | ${ok}`;
  }).join('\n');
  
  return `
═══════════════════════════════════════════════════════════
V3 LAYOUT DIAGNOSTIC REPORT
═══════════════════════════════════════════════════════════

TOKENS:
  NODE_WIDTH: ${tokens.NODE_WIDTH}
  NODE_MAX_HEIGHT: ${tokens.NODE_MAX_HEIGHT}
  GATE_HEIGHT: ${tokens.GATE_HEIGHT}
  LANE_GAP: ${tokens.LANE_GAP}
  TRACK_COLUMN_OFFSET: ${tokens.TRACK_COLUMN_OFFSET}
  GRID: ${tokens.GRID}
  stepY: ${sy}
  YEAR_COL: Y1:${tokens.YEAR_COL.Y1} Y2:${tokens.YEAR_COL.Y2} Y3:${tokens.YEAR_COL.Y3} Y4:${tokens.YEAR_COL.Y4}
  Hash: ${tokenHash}

BUILD INFO:
  UserAgent: ${ua}
  DPR: ${dpr}
  Timestamp: ${new Date().toISOString()}

VIEWPORT:
  ReactFlow zoom: ${widths.zoom.toFixed(3)}
  Tip: DOM rects are visually scaled by zoom; report normalizes widths by dividing by RF zoom.

GRAPH SUMMARY:
  Total nodes: ${graph.nodes.length}
  Total edges: ${graph.edges.length}
  Bundles: ${bundles.length}
  Gates: ${gates.length}

${gridSummary}

BUNDLE POSITIONS (expected row alignment):
${bundles.map(n => {
  const yr = (n.data?.year ?? 1) as 1 | 2 | 3 | 4;
  const exp = yearRow(yr, tokens);
  const drift = Math.abs(n.position.y - exp);
  return `  ${n.id.padEnd(20)} Y${yr} | x:${n.position.x.toString().padStart(5)} y:${n.position.y.toString().padStart(5)} | expected y:${exp.toString().padStart(5)} | drift:${drift.toFixed(1)} ${drift > tokens.GRID ? '❌' : '✅'}`;
}).join('\n')}

GATE POSITIONS (centered in gutter):
${gates.map(n => {
  const yr = (n.data?.year ?? 1) as 1 | 2 | 3 | 4;
  const rowY = yearRow(yr, tokens);
  const exp = rowY + tokens.NODE_MAX_HEIGHT + (tokens.LANE_GAP - tokens.GATE_HEIGHT) / 2;
  const drift = Math.abs(n.position.y - exp);
  return `  ${n.id.padEnd(20)} Y${yr} | x:${n.position.x.toString().padStart(5)} y:${n.position.y.toString().padStart(5)} | expected y:${exp.toString().padStart(5)} | drift:${drift.toFixed(1)} ${drift > tokens.GRID ? '❌' : '✅'}`;
}).join('\n')}

COLUMN DRIFT:
  id                   x     | expected | drift ok
${colDriftRows}

HANDLES:
${handlesAudit}

ALL NODES:
  id                   | type            | yr | lane | position       | handles
  ${nodeTable}

EDGE KINDS: ${JSON.stringify(kinds)}

SPINE DIRECTIONS:
${dirRows || '  (none)'}

EDGES:
  id                             | kind   | source               → target               | ok
  ${edgeTable}

${overlaps.length > 0 ? `OVERLAPS (${overlaps.length}):\n${overlaps.map((o: any) => `  ❌ ${o.A} ↔ ${o.B}`).join('\n')}` : '✅ NO OVERLAPS'}
  Min gap (graph coords): ${minGap.toFixed(1)}px (H_GAP=${tokens.H_GAP}px expected between lanes)

DOM WIDTHS (unscaled):
  Min: ${widths.min}px | Avg: ${widths.avg}px | Max: ${widths.max}px | Zoom: ${widths.zoom.toFixed(3)}
  ${widthStatus}
  ${computedWidthStatus}

RESOLVER/CLAMP IMPACT:
${resolverSummary}

═══════════════════════════════════════════════════════════
`;
}

// ---------- public API ----------
const api = {
  config: state.config,
  hook(fns: Partial<{
    calculateLayout: (nodes:V3Node[], t:Tokens)=>V3Node[];
    resolveCollisions: (nodes:V3Node[], regions:any, t:Tokens)=>V3Node[];
    build: (g:V3Graph)=>{ graph:V3Graph, metrics?:any };
  }>) {
    const wrapped:any = {};
    if (fns.calculateLayout) wrapped.calculateLayout = wrapCalculateLayout(fns.calculateLayout);
    if (fns.resolveCollisions) wrapped.resolveCollisions = wrapResolveCollisions(fns.resolveCollisions);
    if (fns.build) wrapped.build = wrapBuild(fns.build);
    console.log('🧩 V3DBG: hooks installed →', Object.keys(wrapped));
    return wrapped;
  },
  afterRender(graph: V3Graph, tokens: Tokens) {
    state.tokens = tokens;
    updateHUD(graph, tokens);
    // assertions
    try {
      assertRows(graph.nodes, tokens);
      assertGateSlots(graph.nodes, tokens);
      assertColumns(graph.nodes, tokens);
      assertEdges(graph, graph.nodes);
      assertNoOverlaps(graph.nodes, tokens);
    } catch (e) {
      console.error(e);
    }
    snap.save(graph);
  },
  assert: {
    all(graph: V3Graph, t: Tokens){ assertRows(graph.nodes,t); assertGateSlots(graph.nodes,t); assertColumns(graph.nodes,t); assertEdges(graph,graph.nodes); assertNoOverlaps(graph.nodes,t); },
    rows: assertRows,
    columns: assertColumns,
    edges: (g:V3Graph)=> assertEdges(g, g.nodes),
    noOverlaps: (nodes:V3Node[], t:Tokens)=> assertNoOverlaps(nodes,t),
  },
  dom,
  perf,
  snap,
  copyReport() {
    const graph = (window as any).__V3DBG_lastGraph;
    if (!graph || !state.tokens) {
      console.warn('No graph or tokens available. Ensure afterRender() was called.');
      return '';
    }
    const report = generateReport(graph, state.tokens);
    
    // Copy to clipboard
    if (navigator.clipboard) {
      navigator.clipboard.writeText(report).then(() => {
        console.log('📋 Report copied to clipboard!');
      }).catch(err => {
        console.error('Failed to copy:', err);
      });
    }
    
    // Also log it
    console.log(report);
    return report;
  }
};

// install HUD keybinds (you can replace getters with your own closures)
installKeybinds(
  () => (window as any).__V3DBG_lastGraph ?? null,
  () => state.tokens
);

// export to window for easy access in console
;(window as any).__V3DBG = api;

export default api;
