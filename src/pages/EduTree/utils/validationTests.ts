/**
 * Validation tests for multi-gate junction system
 * Run these in browser console to verify implementation
 */

// Test 1: No "null" handles + gate edges use correct handles
export const testHandleIntegrity = `
(() => {
  const es = window.__flowEdges__ || [];
  const gateEdges = es.filter(e => e.source?.startsWith('gate-'));
  return {
    totalEdges: es.length,
    gateEdges: gateEdges.length,
    allStep: es.every(e => e.type === 'step'),
    allArrows: es.every(e => e.markerEnd?.type === 'arrowclosed'),
    noNullHandles: gateEdges.every(e => e.sourceHandle === 'out-se' || e.sourceHandle === 'out-ds' || e.sourceHandle === undefined),
    validHandles: gateEdges.filter(e => e.sourceHandle === 'out-se' || e.sourceHandle === 'out-ds').length
  };
})();
`;

// Test 2: Up/Down positioning sanity for both gates
export const testLanePositioning = `
(() => {
  const ns = window.__flowNodes__ || [];
  const pg = ns.find(n => n.id === 'gate-y2-programs');
  const tg = ns.find(n => n.id === 'gate-y3-tracks');
  const cs = ns.filter(n => n.data?.programId === 'bs_cs');
  const it = ns.filter(n => n.data?.programId === 'bs_it');
  const se = ns.filter(n => n.data?.trackId === 'se');
  const ds = ns.filter(n => n.data?.trackId === 'ds');
  return {
    programGateExists: !!pg,
    trackGateExists: !!tg,
    csAboveProgramGate: !pg || cs.every(n => n.position.y < pg.position.y),
    itBelowProgramGate: !pg || it.every(n => n.position.y > pg.position.y),
    seAboveTrackGate: !tg || se.every(n => n.position.y < tg.position.y),
    dsBelowTrackGate: !tg || ds.every(n => n.position.y > tg.position.y),
  };
})();
`;

// Test 3: No bypass edges that skip gates
export const testNoBypassEdges = `
(() => {
  const es = window.__flowEdges__ || [];
  return {
    noDirectY1toY2: es.filter(e => e.source?.startsWith('y1-') && e.target?.startsWith('y2-')).length === 0,
    noDirectY2toY3: es.filter(e => e.source?.startsWith('y2-') && e.target?.startsWith('y3-')).length === 0,
    totalEdges: es.length
  };
})();
`;

// Test 4: Phase A plan attachment (for future grid mode)
export const testPhaseAPlan = `
(() => {
  const ns = window.__flowNodes__ || [];
  const real = ns.filter(n => !n.data?.isVirtual);
  return {
    totalNodes: ns.length,
    realNodes: real.length,
    planned: real.filter(n => n.data?.phaseAPlan).length,
    allHavePlan: real.every(n => n.data?.phaseAPlan && typeof n.data.phaseAPlan.x === 'number'),
    positionsUnchanged: real.every(n => (n.position?.x ?? 0) !== 0 && (n.position?.y ?? 0) !== 0),
    samplePlan: real[0]?.data?.phaseAPlan
  };
})();
`;

console.log('Multi-Gate Validation Tests loaded. Run in console:');
console.log('- testHandleIntegrity');
console.log('- testLanePositioning'); 
console.log('- testNoBypassEdges');
console.log('- testPhaseAPlan');