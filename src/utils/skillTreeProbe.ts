// 🔧 STEP 6: One-shot runtime probe for debugging
export function runSkillTreeProbe() {
  const rf = document.querySelector('.react-flow');
  const canvas = document.querySelector('[data-testid="skill-tree-canvas"]');
  const domNodes = [...document.querySelectorAll('[data-testid="skill-node"]')];
  const diag = (window as any).__skillTreeDiag;
  
  const probe = {
    // Environment
    canvasPresent: !!canvas,
    canvasHeight: canvas?.clientHeight || 0,
    reactFlowPresent: !!rf,
    reactFlowHeight: rf?.clientHeight || 0,
    
    // DOM Reality
    domNodesCount: domNodes.length,
    first3DomIds: domNodes.slice(0, 3).map(n => n.getAttribute('data-node-id')),
    
    // Pipeline Data
    hookNodes: diag?.nodesCount || 'no-diag',
    hookEdges: diag?.edgesCount || 'no-diag',
    sampleNode: diag?.sampleNode || 'no-diag',
    
    // Potential Blockers
    overlayAt10x10: document.elementFromPoint(10, 10)?.className || 'none',
    bodyOverflow: getComputedStyle(document.body).overflow,
    canvasDisplay: canvas ? getComputedStyle(canvas).display : 'not-found',
    
    // Debug Flags
    debugFlags: {
      ST_FORCE_TEST: localStorage.getItem('ST_FORCE_TEST'),
      ST_FORCE_GRID: localStorage.getItem('ST_FORCE_GRID'), 
      ST_HARNESS: localStorage.getItem('ST_HARNESS'),
    }
  };
  
  console.log('🔎 SKILL TREE PROBE RESULTS:', probe);
  
  // Auto-diagnosis
  if (probe.domNodesCount === 0 && probe.reactFlowHeight > 0) {
    console.warn('🚨 DIAGNOSIS: Data/pipeline issue - ReactFlow container exists but no nodes rendered');
  } else if (probe.domNodesCount === 0 && probe.reactFlowHeight === 0) {
    console.warn('🚨 DIAGNOSIS: Container/CSS/SSR issue - ReactFlow container not rendered');
  } else if (probe.domNodesCount > 0) {
    console.log('✅ DIAGNOSIS: Nodes are rendering correctly');
  }
  
  return probe;
}

// 🔧 Enhanced quick probe for instant diagnosis
export function quickProbe() {
  const diag = (window as any).__skillTreeDiag;
  const rf = document.querySelector('.react-flow');
  const canvas = document.querySelector('[data-testid="skill-tree-canvas"]');
  const domNodes = [...document.querySelectorAll('[data-testid="skill-node"]')];

  const flags = {
    ST_FORCE_TEST: localStorage.getItem('ST_FORCE_TEST'),
    ST_FORCE_GRID: localStorage.getItem('ST_FORCE_GRID'),
  };

  const out = {
    rfMounted: !!rf,
    canvas: !!canvas,
    domNodes: domNodes.length,
    first3DomIds: domNodes.slice(0, 3).map(n => n.getAttribute('data-node-id')),
    hookNodes: diag?.hook?.nodes ?? diag?.nodesCount ?? 'n/a',
    hookEdges: diag?.hook?.edges ?? diag?.edgesCount ?? 'n/a',
    canvasH: canvas?.clientHeight ?? 0,
    overlayAt10x10: document.elementFromPoint(10, 10)?.className || 'none',
    flags
  };

  console.log('🔎 QUICK SKILL TREE PROBE', out);

  // Instant diagnosis
  if (!out.rfMounted) {
    console.warn('❌ ReactFlow not mounted (container/JSX issue).');
  } else if (out.hookNodes > 0 && out.domNodes === 0) {
    console.warn('❌ Data present but nothing rendered (types/IDs/layout).');
  } else if (out.domNodes > 0) {
    console.log('✅ Nodes are in the DOM.');
  }

  return out;
}

// Global probe functions for console
if (typeof window !== 'undefined') {
  (window as any).probeSkillTree = runSkillTreeProbe;
  (window as any).quickProbe = quickProbe;
}