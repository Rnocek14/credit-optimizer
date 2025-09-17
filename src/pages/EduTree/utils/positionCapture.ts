/**
 * Utility functions for capturing and analyzing manual node positions
 */

export interface CapturedPosition {
  x: number;
  y: number;
  nodeId: string;
  nodeType?: string;
  nodeData?: any;
}

/**
 * Save the current manual positions to console for analysis
 */
export function exportManualPositions() {
  const positions = (window as any).manualPositions;
  if (!positions) {
    console.log('❌ No manual positions captured yet. Start dragging nodes!');
    return;
  }

  console.log('📍 MANUAL POSITIONS CAPTURED:');
  console.log(JSON.stringify(positions, null, 2));
  
  // Also save to clipboard if available
  if (navigator.clipboard) {
    navigator.clipboard.writeText(JSON.stringify(positions, null, 2))
      .then(() => console.log('✅ Positions copied to clipboard!'))
      .catch(() => console.log('❌ Failed to copy to clipboard'));
  }
  
  return positions;
}

/**
 * Clear all captured positions
 */
export function clearManualPositions() {
  (window as any).manualPositions = {};
  console.log('🗑️ Manual positions cleared');
}

/**
 * Add to window for easy console access
 */
if (typeof window !== 'undefined') {
  (window as any).exportManualPositions = exportManualPositions;
  (window as any).clearManualPositions = clearManualPositions;
}