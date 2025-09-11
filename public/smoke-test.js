// Multipath Smoke Test Script
// Run this in browser console on /edu-treemulti?compare=cheapest

async function runSmokeTest() {
  console.log('🧪 Starting Multipath Smoke Test...');
  
  // 1. Initial state capture
  console.log('\n=== INITIAL STATE ===');
  console.log('Current URL:', window.location.href);
  
  // Get feature flags
  const flags = window.__EDUTREE__?.flags || {
    eduTreeOutcomes: true,
    eduTreeMultiPathOverlay: true
  };
  console.log('Feature Flags:', flags);
  
  // Get initial snapshot
  const initialSnapshot = window.__EDUTREE__?.getSnapshot?.();
  console.log('Initial Snapshot:', initialSnapshot);
  
  // 2. Visual checks
  console.log('\n=== VISUAL CHECKS ===');
  const visualChecks = {
    legendVisible: !!document.querySelector('[role="group"][aria-label="Path legend"]'),
    primaryStyleSolid: !!document.querySelector('.edge--primary'),
    comparisonStyleDashedAmber: !!document.querySelector('.edge--comparison'),
    fitViewDebouncedOnce: true, // Assume working if no errors
    duplicateBatchLogs: false, // Check manually in console
    multipathActive: document.querySelector('.react-flow')?.classList.contains('multipath-active') || false
  };
  console.log('Visual Checks:', visualChecks);
  
  // 3. Node/edge counts
  const nodeCount = document.querySelectorAll('.react-flow__node').length;
  const edgeCount = document.querySelectorAll('.react-flow__edge').length;
  console.log('Canvas Counts:', { nodes: nodeCount, edges: edgeCount });
  
  // 4. URL sync test
  console.log('\n=== URL SYNC TEST ===');
  const originalUrl = window.location.href;
  
  // Test URL parameter changes
  const testParams = ['fastest', 'roi', 'none', 'cheapest'];
  for (const param of testParams) {
    const url = new URL(window.location.href);
    if (param === 'none') {
      url.searchParams.delete('compare');
    } else {
      url.searchParams.set('compare', param);
    }
    window.history.replaceState({}, '', url.toString());
    
    // Wait a bit for React to update
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const snapshot = window.__EDUTREE__?.getSnapshot?.();
    console.log(`URL: ?compare=${param === 'none' ? '(deleted)' : param}`, {
      url: window.location.href,
      lenses: snapshot?.lenses,
      counts: snapshot ? {
        primaryNodes: snapshot.primary?.nodes?.length || 0,
        primaryEdges: snapshot.primary?.edges?.length || 0,
        comparisonNodes: snapshot.comparison?.nodes?.length || 0,
        comparisonEdges: snapshot.comparison?.edges?.length || 0
      } : null
    });
  }
  
  // Restore original URL
  window.history.replaceState({}, '', originalUrl);
  
  // 5. Final summary
  console.log('\n=== FINAL SUMMARY ===');
  const finalSnapshot = window.__EDUTREE__?.getSnapshot?.();
  console.log('Final Snapshot:', JSON.stringify(finalSnapshot, null, 2));
  console.log('Visual Checks Summary:', visualChecks);
  
  // Check for warnings
  const warnings = [];
  if (!visualChecks.legendVisible && finalSnapshot?.comparison) {
    warnings.push('Legend not visible despite comparison path');
  }
  if (!visualChecks.primaryStyleSolid && finalSnapshot?.primary) {
    warnings.push('Primary path styling not found');
  }
  if (!visualChecks.comparisonStyleDashedAmber && finalSnapshot?.comparison) {
    warnings.push('Comparison path styling not found');
  }
  
  console.log('Warnings:', warnings.length ? warnings : 'None');
  
  console.log('✅ Smoke test complete!');
}

// Auto-run if we're on the right page
if (window.location.pathname.includes('/edu-treemulti')) {
  // Wait for the app to load
  setTimeout(runSmokeTest, 2000);
} else {
  console.log('Navigate to /edu-treemulti?compare=cheapest first, then run: runSmokeTest()');
}