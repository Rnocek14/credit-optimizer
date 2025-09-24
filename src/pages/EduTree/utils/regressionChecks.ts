// Console regression check functions for EduTree V2

export function assertNoDanglingHeaders(params: { 
  edges: any[]; 
  nodes: any[]; 
}): { issues: number; details: string[] } {
  const { edges, nodes } = params;
  const nodeIds = new Set(nodes.map(n => n.id));
  const issues: string[] = [];

  edges.forEach(edge => {
    if (!nodeIds.has(edge.source)) {
      issues.push(`Edge ${edge.id} has missing source: ${edge.source}`);
    }
    if (!nodeIds.has(edge.target)) {
      issues.push(`Edge ${edge.id} has missing target: ${edge.target}`);
    }
  });

  return { issues: issues.length, details: issues };
}

export function assertGateX(params: { 
  nodes: any[]; 
  gatePositions: any; 
  cols?: any; 
}): { issues: number; details: string[] } {
  const { nodes, gatePositions } = params;
  const issues: string[] = [];

  if (!gatePositions) {
    issues.push('No gatePositions provided');
    return { issues: issues.length, details: issues };
  }

  const gateNodes = nodes.filter(n => n.type === 'gate');
  
  gateNodes.forEach(gate => {
    let expectedX: number | undefined;
    
    // Map gate IDs to their expected positions from gatePositions object
    if (gate.id === 'gate-y2-programs') {
      expectedX = gatePositions.showPG ? gatePositions.pgX : undefined;
    } else if (gate.id === 'gate-y3-tracks') {
      expectedX = gatePositions.showTG ? gatePositions.tgX : undefined;
    }
    
    if (expectedX === undefined) {
      issues.push(`Gate ${gate.id} missing from gatePositions`);
      return;
    }
    
    const actualX = gate.position?.x;
    if (actualX !== undefined && Math.abs(actualX - expectedX) > 5) {
      issues.push(`Gate ${gate.id} X mismatch: expected ${expectedX}, got ${actualX}`);
    }
  });

  return { issues: issues.length, details: issues };
}

export function assertHandlesOnce(nodes: any[]): { issues: number; details: string[] } {
  const issues: string[] = [];
  const handlesUpdated = new Set<string>();

  nodes.forEach(node => {
    const nodeKey = `${node.id}-${node.type}-${JSON.stringify(node.data)}`;
    if (handlesUpdated.has(nodeKey)) {
      issues.push(`Node ${node.id} handles updated multiple times with same config`);
    } else {
      handlesUpdated.add(nodeKey);
    }
  });

  return { issues: issues.length, details: issues };
}

// Main regression runner
export function runRegressionChecks(context: {
  edges: any[];
  nodes: any[];
  gatePositions?: any;
  cols?: any;
}) {
  const checks = {
    danglingHeaders: assertNoDanglingHeaders({ edges: context.edges, nodes: context.nodes }),
    gateX: assertGateX({ nodes: context.nodes, gatePositions: context.gatePositions, cols: context.cols }),
    handlesOnce: assertHandlesOnce(context.nodes)
  };

  const totalIssues = Object.values(checks).reduce((sum, check) => sum + check.issues, 0);
  
  console.group('[Regression Checks]');
  console.log('🔍 Dangling Headers:', checks.danglingHeaders.issues === 0 ? '✅' : `❌ ${checks.danglingHeaders.issues}`, checks.danglingHeaders.details);
  console.log('🎯 Gate X Alignment:', checks.gateX.issues === 0 ? '✅' : `❌ ${checks.gateX.issues}`, checks.gateX.details);
  console.log('🔄 Handle Updates:', checks.handlesOnce.issues === 0 ? '✅' : `❌ ${checks.handlesOnce.issues}`, checks.handlesOnce.details);
  console.log('📊 Total Issues:', totalIssues);
  console.groupEnd();

  return { totalIssues, checks };
}