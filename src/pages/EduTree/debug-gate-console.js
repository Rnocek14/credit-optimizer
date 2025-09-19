// Debug console commands for gate positioning
// Paste these in browser console on /edu-tree-v2 page

// 1. Quick gate position verification
console.log('=== GATE POSITIONING DEBUG ===');

// Basic gate position check
const cols = { y1:200, y2:600, y3:1300, y4:1700 };
const gp = window.gatePositions || window.decideGatePositions?.({
  blocks: window.__flowBlocks__ || [],
  programs: ['bs_cs','bs_it'],
  tracksByProgram: { bs_cs: ['se','ds'], bs_it: [] },
  cols
});

console.log('gatePositions:', gp);

// Check for bad handles in current edges
const edges = window.__flowEdges__ || [];
const bad = edges.filter(e =>
  e.sourceHandle === null || e.sourceHandle === 'null' || e.targetHandle === 'null'
);

console.log('Bad handles found:', bad.length);
if (bad.length > 0) {
  console.error('❌ Edges with bad handles:', bad);
  bad.forEach(edge => {
    console.log(`Edge ${edge.id}: sourceHandle="${edge.sourceHandle}", targetHandle="${edge.targetHandle}"`);
  });
}

// Check gate nodes
const nodes = window.__flowNodes__ || [];
const gateNodes = nodes.filter(n => n.type === 'gate');
console.log('Gate nodes:', gateNodes.map(g => ({ id: g.id, hidden: g.hidden, x: g.position?.x })));

// Test the divergence calculation directly
const blocks = window.__flowBlocks__ || [];
const years = [1,2,3,4];

// Helper: include shared (no program_id) blocks in BOTH program sets
const perYear = (programId) => {
  const map = new Map(years.map(y => [y, new Set()]));
  for (const b of blocks) {
    if (!years.includes(b.level_year)) continue;
    const shared = !b.program_id;
    const match = b.program_id === programId || shared;
    if (match) map.get(b.level_year).add(b.id);
  }
  return map;
};

const A = perYear('bs_cs'), B = perYear('bs_it');
const firstDiffYear = years.find(y => {
  const s1 = A.get(y), s2 = B.get(y);
  if (s1.size !== s2.size) return true;
  for (const v of s1) if (!s2.has(v)) return true;
  return false;
});

console.log('First program diff year:', firstDiffYear ?? '(none)');
if (firstDiffYear) {
  const between = [firstDiffYear - 1, firstDiffYear];
  const x = (cols[`y${between[0]}`] + cols[`y${between[1]}`]) / 2;
  console.log('Expected Program Gate between Y' + between.join(' and Y') + ' @ x=', x);
}