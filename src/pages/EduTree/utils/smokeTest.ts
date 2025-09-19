// Console smoke test for EduTree V2 - ChatGPT's validation script
export function runSmokeTest() {
  console.group('🔍 EduTree V2 Smoke Test');
  
  const edges = (window as any).__flowEdges__ || [];
  const nodes = (window as any).__flowNodes__ || [];
  const ids = new Set(nodes.filter((n: any) => !n.hidden).map((n: any) => n.id));

  // 1) No bad handles
  const bad = edges.filter((e: any) =>
    e.sourceHandle === null || e.sourceHandle === 'null' || e.targetHandle === 'null'
  );
  console.assert(bad.length === 0, '❌ Bad handles found', bad);
  if (bad.length === 0) {
    console.log('✅ No bad handles');
  } else {
    console.error('❌ Bad handles:', bad);
  }

  // 2) No dangling
  const dangling = edges.filter((e: any) => !ids.has(e.source) || !ids.has(e.target));
  console.assert(dangling.length === 0, '❌ Dangling edges', dangling);
  if (dangling.length === 0) {
    console.log('✅ No dangling edges');
  } else {
    console.error('❌ Dangling edges:', dangling);
  }

  // 3) Metro edges present only when headers exist
  const hasHeaders = nodes.some((n: any) => /^program-header:|^track-header:/.test(n.id));
  const metros = edges.filter((e: any) => e.type === 'metroGate');
  console.assert(!hasHeaders || metros.length > 0, '❌ Headers present but no metro edges');
  
  if (hasHeaders && metros.length > 0) {
    console.log('✅ Metro edges present with headers');
  } else if (!hasHeaders) {
    console.log('ℹ️ No headers present (expected in single-rail mode)');
  } else {
    console.error('❌ Headers present but no metro edges');
  }

  console.log('📊 Summary:', {
    edges: edges.length,
    metros: metros.length,
    headers: hasHeaders,
    nodes: nodes.length,
    hiddenNodes: nodes.filter((n: any) => n.hidden).length
  });
  
  console.groupEnd();
  
  return {
    badHandles: bad.length,
    danglingEdges: dangling.length,
    hasHeaders,
    metroCount: metros.length,
    passed: bad.length === 0 && dangling.length === 0
  };
}

// Auto-run in dev mode
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as any).runSmokeTest = runSmokeTest;
}