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
  const W = t.NODE_WIDTH, H = t.NODE_MAX_HEIGHT;
  const boxes = nodes.map(n => ({
    id:n.id, type:n.type, x:n.position.x, y:n.position.y, w:W, h:H
  }));
  const overlaps:any[] = [];
  for (let i=0;i<boxes.length;i++){
    for (let j=i+1;j<boxes.length;j++){
      const a=boxes[i], b=boxes[j];
      const xOver = !(a.x + a.w <= b.x || b.x + b.w <= a.x);
      const yOver = !(a.y + a.h <= b.y || b.y + b.h <= a.y);
      if (xOver && yOver) overlaps.push({ A:a.id, B:b.id });
    }
  }
  return overlaps;
}

function assertNoOverlaps(nodes: V3Node[], t: Tokens) {
  const ov = detectOverlaps(nodes, t);
  if (ov.length) {
    console.groupCollapsed(`❌ Overlaps: ${ov.length}`);
    console.table(ov);
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
  measureWidths: () => {
    const rows = dom.nodes().map(el => ({
      id: el.dataset.id || '(unknown)',
      w: Math.round(el.getBoundingClientRect().width),
      h: Math.round(el.getBoundingClientRect().height)
    }));
    const widths = rows.map(r => r.w);
    const min = Math.min(...widths), max = Math.max(...widths);
    const avg = Math.round(widths.reduce((a,b)=>a+b,0)/Math.max(1,widths.length));
    console.table(rows);
    console.log('DOM Widths → min:',min,' avg:',avg,' max:',max);
    return { rows, min, avg, max };
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
  const overlaps = detectOverlaps(graph.nodes, tokens);
  const widths = dom.measureWidths();
  
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
    const ok = e.kind === 'spine' ? (sy < ty ? '✅' : '❌') : '-';
    return `${e.id.padEnd(25)} | ${(e.kind || '-').padEnd(6)} | ${e.source.padEnd(20)} → ${e.target.padEnd(20)} | ${ok}`;
  }).join('\n');
  
  return `
═══════════════════════════════════════════════════════════
V3 LAYOUT DIAGNOSTIC REPORT
═══════════════════════════════════════════════════════════

TOKENS:
  NODE_WIDTH: ${tokens.NODE_WIDTH}
  NODE_MAX_HEIGHT: ${tokens.NODE_MAX_HEIGHT}
  LANE_GAP: ${tokens.LANE_GAP}
  TRACK_COLUMN_OFFSET: ${tokens.TRACK_COLUMN_OFFSET}
  GRID: ${tokens.GRID}
  stepY: ${sy}
  YEAR_COL: Y1:${tokens.YEAR_COL.Y1} Y2:${tokens.YEAR_COL.Y2} Y3:${tokens.YEAR_COL.Y3} Y4:${tokens.YEAR_COL.Y4}

GRAPH SUMMARY:
  Total nodes: ${graph.nodes.length}
  Total edges: ${graph.edges.length}
  Bundles: ${bundles.length}
  Gates: ${gates.length}
  Overlaps: ${overlaps.length}

BUNDLE POSITIONS (expected row alignment):
${bundles.map(n => {
  const yr = (n.data?.year ?? 1) as 1|2|3|4;
  const exp = yearRow(yr, tokens);
  const drift = Math.abs(n.position.y - exp);
  return `  ${n.id.padEnd(20)} Y${yr} | x:${n.position.x.toString().padStart(5)} y:${n.position.y.toString().padStart(5)} | expected y:${exp.toString().padStart(5)} | drift:${drift.toFixed(1)} ${drift > tokens.GRID ? '❌' : '✅'}`;
}).join('\n')}

GATE POSITIONS (expected mid-slot):
${gates.map(n => {
  const yr = (n.data?.year ?? 1) as 1|2|3|4;
  const exp = gateSlot(yr, tokens);
  const drift = Math.abs(n.position.y - exp);
  return `  ${n.id.padEnd(20)} Y${yr} | x:${n.position.x.toString().padStart(5)} y:${n.position.y.toString().padStart(5)} | expected y:${exp.toString().padStart(5)} | drift:${drift.toFixed(1)} ${drift > tokens.GRID ? '❌' : '✅'}`;
}).join('\n')}

ALL NODES:
  id                   | type            | yr | lane | position       | handles
  ${nodeTable}

EDGES:
  id                        | kind   | source               → target               | ok
  ${edgeTable}

${overlaps.length > 0 ? `OVERLAPS (${overlaps.length}):\n${overlaps.map(o => `  ❌ ${o.A} ↔ ${o.B}`).join('\n')}` : '✅ NO OVERLAPS'}

DOM WIDTHS:
  Min: ${widths.min}px | Avg: ${widths.avg}px | Max: ${widths.max}px
  ${widths.max > tokens.NODE_WIDTH ? '❌ Some nodes exceed NODE_WIDTH!' : '✅ All nodes within NODE_WIDTH'}

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
