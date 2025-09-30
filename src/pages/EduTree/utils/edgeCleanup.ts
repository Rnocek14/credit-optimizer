/**
 * Edge cleanup utilities to prevent validator false positives
 * Removes edges to hidden/missing nodes and repairs malformed handles
 */

// Export fixHandle for use at edge creation time
export function fixHandle(handle: any): string | null {
  // Comprehensive handle normalization - catch all toxic variations
  if (
    handle === 'null' || 
    handle === 'undefined' || 
    handle === 'NaN' ||
    handle === null || 
    handle === undefined ||
    handle === '' ||
    (typeof handle === 'string' && handle.trim() === '')
  ) {
    return null;
  }
  
  // Ensure it's a string
  return typeof handle === 'string' ? handle : String(handle);
}

export function cleanupEdgesBeforeValidation(edges: any[], nodes: any[]) {
  const visibleIds = new Set(
    nodes.filter(n => n.visible !== false && !n.hidden).map(n => n.id)
  );

  return edges
    .filter(e => {
      // Remove dangling edges (source or target doesn't exist)
      const hasSource = visibleIds.has(e.source);
      const hasTarget = visibleIds.has(e.target);
      
      if (!hasSource || !hasTarget) {
        if (import.meta.env.DEV && Math.random() < 0.02) {
          console.log('[EdgeCleanup] Removing dangling edge:', {
            id: e.id,
            source: e.source,
            target: e.target,
            hasSource,
            hasTarget
          });
        }
        return false;
      }
      
      return true;
    })
    .map(e => {
      // Repair malformed handles using exported fixHandle
      const sourceHandle = fixHandle(e.sourceHandle);
      const targetHandle = fixHandle(e.targetHandle);
      
      if (sourceHandle !== e.sourceHandle || targetHandle !== e.targetHandle) {
        if (import.meta.env.DEV && Math.random() < 0.02) {
          console.log('[EdgeCleanup] Fixed handles:', {
            id: e.id,
            oldSource: e.sourceHandle,
            newSource: sourceHandle,
            oldTarget: e.targetHandle,
            newTarget: targetHandle
          });
        }
      }
      
      return {
        ...e,
        sourceHandle,
        targetHandle
      };
    });
}

// Kept for backward compatibility but no longer needed as separate function
function fixHandleInternal(handle: any): string | null {
  return fixHandle(handle);
}
