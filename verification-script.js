// Stage 3 EduTree Stabilization Verification Script
// Run this in browser console at the test URL

console.log('=== STAGE 3 VERIFICATION SUITE ===');

// Test URL to navigate to (copy-paste this):
const testUrl = '/edu-tree?eduTree=true&eduTreePhaseA=true&eduTreeQAMode=true&eduTreeMultiPathOverlay=true&comparePrimary=both&primary=se&comparison=ds&cmp=1';
console.log('Test URL:', window.location.origin + testUrl);

// Current URL check
console.log('Current URL:', window.location.href);
console.log('Current search params:', window.location.search);

// 1. QA METRICS VERIFICATION
console.log('\n--- QA METRICS CHECK ---');
const qaMetrics = window.__EDUTREE_QA__;
if (!qaMetrics) {
  console.error('❌ QA metrics not found! Ensure QA mode is enabled.');
} else {
  console.log('✅ QA metrics found:', qaMetrics);
  
  // Core stability metrics
  const tests = [
    { name: 'forwardEdgeViolations', expected: 0, actual: qaMetrics.forwardEdgeViolations },
    { name: 'cycleDetected', expected: false, actual: qaMetrics.cycleDetected },
    { name: 'divergenceGateId', expected: 'divergence-gate', actual: qaMetrics.divergenceGateId },
    { name: 'sameLevelEdges >= 1', expected: true, actual: qaMetrics.sameLevelEdges >= 1 }
  ];
  
  tests.forEach(test => {
    const passed = test.actual === test.expected;
    console.log(`${passed ? '✅' : '❌'} ${test.name}: ${test.actual} (expected: ${test.expected})`);
  });
}

// 2. DIVERGENCE GATE VERIFICATION
console.log('\n--- DIVERGENCE GATE CHECK ---');
const gateElement = document.querySelector('[data-node-id="divergence-gate"]');
if (gateElement) {
  const levelYear = gateElement.getAttribute('data-level-year');
  console.log('✅ Divergence gate found, level_year:', levelYear);
} else {
  console.log('❌ Divergence gate not found in DOM');
}

// 3. BRIDGE NODE VERIFICATION
console.log('\n--- BRIDGE NODE CHECK ---');
const bridgeNodes = [...document.querySelectorAll('[data-type="laneBridge"], .node--bridge')];
console.log(`Bridge nodes visible: ${bridgeNodes.length} (should be 0)`);
if (bridgeNodes.length === 0) {
  console.log('✅ No visible bridge nodes');
} else {
  console.log('❌ Bridge nodes still visible:', bridgeNodes);
}

// 4. BALANCED MODE VERIFICATION
console.log('\n--- BALANCED MODE CHECK ---');
const primaryTrackAttr = document.body.getAttribute('data-primary-track');
if (primaryTrackAttr === null) {
  console.log('✅ Balanced mode active (no track dimming)');
} else {
  console.log('❌ Track dimming active:', primaryTrackAttr, '(should be null for balanced mode)');
}

// 5. VISUAL LAYOUT VERIFICATION
console.log('\n--- VISUAL LAYOUT CHECK ---');
const allNodes = [...document.querySelectorAll('[data-testid="lp-node"], [data-node-id]')];
console.log(`Total nodes visible: ${allNodes.length}`);

// Check for overlapping nodes (basic overlap detection)
const nodePositions = allNodes.map(node => {
  const rect = node.getBoundingClientRect();
  return {
    id: node.getAttribute('data-node-id') || node.getAttribute('data-testid'),
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height
  };
});

let overlaps = 0;
for (let i = 0; i < nodePositions.length; i++) {
  for (let j = i + 1; j < nodePositions.length; j++) {
    const a = nodePositions[i];
    const b = nodePositions[j];
    if (a.x < b.x + b.width && a.x + a.width > b.x && 
        a.y < b.y + b.height && a.y + a.height > b.y) {
      overlaps++;
    }
  }
}
console.log(`Node overlaps detected: ${overlaps} (should be 0-2)`);

// 6. EDGE TYPE VERIFICATION
console.log('\n--- EDGE TYPE CHECK ---');
const allEdges = [...document.querySelectorAll('.react-flow__edge')];
const stepEdges = allEdges.filter(edge => edge.classList.contains('react-flow__edge-step') || 
                                         edge.querySelector('.react-flow__edge-path[stroke-dasharray]'));
console.log(`Total edges: ${allEdges.length}`);
console.log(`Step/orthogonal edges: ${stepEdges.length}`);

// 7. URL PARAMETER STATUS
console.log('\n--- URL PARAMETER STATUS ---');
const urlParams = new URLSearchParams(window.location.search);
const paramChecks = [
  'eduTree', 'eduTreePhaseA', 'eduTreeQAMode', 
  'eduTreeMultiPathOverlay', 'comparePrimary', 'primary', 'comparison'
];
paramChecks.forEach(param => {
  console.log(`${param}: ${urlParams.get(param)}`);
});

// 8. MULTI-LANE SPLITTING STATUS
console.log('\n--- MULTI-LANE SPLITTING STATUS ---');
const splitMultiLane = urlParams.get('qaSplitMultiLane') === 'true';
console.log(`qaSplitMultiLane: ${splitMultiLane} (bridge splitting ${splitMultiLane ? 'ON' : 'OFF'})`);

// 9. SUMMARY
console.log('\n=== VERIFICATION SUMMARY ===');
const allPassed = qaMetrics && 
                  qaMetrics.forwardEdgeViolations === 0 && 
                  qaMetrics.cycleDetected === false &&
                  qaMetrics.divergenceGateId === 'divergence-gate' &&
                  qaMetrics.sameLevelEdges >= 1 &&
                  gateElement &&
                  bridgeNodes.length === 0 &&
                  primaryTrackAttr === null &&
                  overlaps <= 2;

if (allPassed) {
  console.log('🎉 STAGE 3 STABILIZATION: ALL TESTS PASSED');
} else {
  console.log('⚠️  STAGE 3 STABILIZATION: SOME TESTS FAILED - CHECK ABOVE');
}

// 10. ALTERNATIVE TEST URLS
console.log('\n--- ALTERNATIVE TEST URLS ---');
console.log('Bridge splitting ON:', window.location.origin + testUrl + '&qaSplitMultiLane=true');
console.log('Bridge splitting OFF (default):', window.location.origin + testUrl);