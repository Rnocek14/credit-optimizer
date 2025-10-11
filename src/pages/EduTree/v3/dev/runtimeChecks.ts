/**
 * Runtime diagnostic utilities for V3 health checks
 * Exposed globally via window.runV3HealthCheck()
 */

interface HealthCheckResult {
  status: 'ok' | 'warnings' | 'errors' | 'no-data';
  y3Alignment?: {
    ok: boolean;
    reason?: string;
    ys?: number[];
    drift?: number;
  };
  overlaps?: {
    hasOverlaps: boolean;
    count: number;
    diagnostics?: any[];
  };
  edgeValidity?: {
    ok: boolean;
    invalidEdges: string[];
    totalEdges: number;
  };
  checkpointPositions?: {
    ok: boolean;
    issues: string[];
  };
}

function checkY3Alignment(nodes: any[]): HealthCheckResult['y3Alignment'] {
  const y3 = nodes.filter(n => n.data?.year === 3);
  
  if (y3.length < 2) {
    return { ok: true, reason: 'single-track' };
  }
  
  const ys = y3.map(n => n.position.y);
  const allSame = ys.every(y => y === ys[0]);
  const drift = Math.max(...ys) - Math.min(...ys);
  
  return { 
    ok: allSame, 
    ys, 
    drift,
    ...(drift > 0 && { reason: `Y3 bundles misaligned by ${drift}px` })
  };
}

function checkEdgeValidity(nodes: any[], edges: any[]): HealthCheckResult['edgeValidity'] {
  const nodeIds = new Set(nodes.map(n => n.id));
  const invalidEdges: string[] = [];
  
  edges.forEach(edge => {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      invalidEdges.push(`${edge.id}: ${edge.source} → ${edge.target}`);
    }
  });
  
  return {
    ok: invalidEdges.length === 0,
    invalidEdges,
    totalEdges: edges.length
  };
}

function checkCheckpointPositions(nodes: any[]): HealthCheckResult['checkpointPositions'] {
  const checkpoints = nodes.filter(n => n.type === 'checkpoint');
  const issues: string[] = [];
  
  checkpoints.forEach(cp => {
    const sourceNode = nodes.find(n => n.id === cp.data?.sourceNodeId);
    
    if (!sourceNode) {
      issues.push(`Checkpoint ${cp.id} missing source node ${cp.data?.sourceNodeId}`);
      return;
    }
    
    // Checkpoint should be below source
    if (cp.position.y <= sourceNode.position.y) {
      issues.push(`Checkpoint ${cp.id} not below source (y: ${cp.position.y} vs source: ${sourceNode.position.y})`);
    }
  });
  
  return {
    ok: issues.length === 0,
    issues
  };
}

export function runV3HealthCheck(): HealthCheckResult {
  const dump = (window as any).__dumpV3?.();
  
  if (!dump) {
    return { status: 'no-data' };
  }
  
  const checks: HealthCheckResult = {
    status: 'ok',
    y3Alignment: checkY3Alignment(dump.nodes),
    edgeValidity: checkEdgeValidity(dump.nodes, dump.edges),
    checkpointPositions: checkCheckpointPositions(dump.nodes)
  };
  
  // Check for overlaps if validator is available
  const validator = (window as any).__lpV3?.validateNoOverlaps;
  if (validator) {
    const overlapResult = validator();
    checks.overlaps = {
      hasOverlaps: overlapResult.hasOverlaps,
      count: overlapResult.overlaps?.length || 0,
      diagnostics: overlapResult.diagnostics
    };
  }
  
  // Determine overall status
  const hasErrors = 
    !checks.y3Alignment?.ok || 
    !checks.edgeValidity?.ok || 
    !checks.checkpointPositions?.ok ||
    checks.overlaps?.hasOverlaps;
  
  checks.status = hasErrors ? 'errors' : 'ok';
  
  console.log('🔬 V3 Health Check:', checks);
  return checks;
}

// Expose globally for dev console access
if (import.meta.env.DEV) {
  (window as any).runV3HealthCheck = runV3HealthCheck;
}
