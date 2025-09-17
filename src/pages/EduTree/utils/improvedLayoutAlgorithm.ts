/**
 * Improved layout algorithm based on manual positioning analysis
 * Learned from user's optimal tree arrangement
 */

interface ManualPositionData {
  [nodeId: string]: { x: number; y: number };
}

interface LayoutRule {
  yearSpacing: number;
  baseY: number;
  columnPositions: number[];
  nodeAlignment: 'left' | 'center' | 'spread';
}

/**
 * Analyze manual positions to extract layout rules
 */
export function analyzeManualLayout(positions: ManualPositionData): LayoutRule {
  const positionArray = Object.values(positions);
  
  // Group by approximate Y levels (within 50 units = same level)
  const yLevels = new Map<number, { x: number; y: number }[]>();
  
  positionArray.forEach(pos => {
    let foundLevel = false;
    for (const [levelY, nodes] of yLevels.entries()) {
      if (Math.abs(pos.y - levelY) < 100) { // Group nodes within 100 units vertically
        nodes.push(pos);
        foundLevel = true;
        break;
      }
    }
    
    if (!foundLevel) {
      yLevels.set(pos.y, [pos]);
    }
  });
  
  // Sort levels by Y coordinate
  const sortedLevels = Array.from(yLevels.entries()).sort(([a], [b]) => a - b);
  
  // Calculate spacing between levels
  const spacings = [];
  for (let i = 1; i < sortedLevels.length; i++) {
    spacings.push(sortedLevels[i][0] - sortedLevels[i-1][0]);
  }
  
  const avgSpacing = spacings.length > 0 ? spacings.reduce((a, b) => a + b, 0) / spacings.length : 700;
  
  // Extract column positions from X coordinates
  const allXPositions = positionArray.map(p => p.x).sort((a, b) => a - b);
  const uniqueColumns = [...new Set(allXPositions.map(x => Math.round(x / 100) * 100))]; // Round to nearest 100
  
  console.log('[Layout Analysis]', {
    levels: sortedLevels.length,
    avgSpacing,
    uniqueColumns,
    yLevels: Array.from(yLevels.entries()).map(([y, nodes]) => ({ y, count: nodes.length }))
  });
  
  return {
    yearSpacing: avgSpacing,
    baseY: sortedLevels[0]?.[0] || -500,
    columnPositions: uniqueColumns,
    nodeAlignment: 'spread'
  };
}

/**
 * Apply learned layout rules to position nodes
 */
export function applyLearnedLayout(
  nodes: any[], 
  rules: LayoutRule,
  getLevelYear: (node: any) => number
): any[] {
  console.log('[Learned Layout] Applying rules:', rules);
  
  // Group nodes by year/level
  const nodesByYear = new Map<number, any[]>();
  nodes.forEach(node => {
    const year = getLevelYear(node);
    if (!nodesByYear.has(year)) {
      nodesByYear.set(year, []);
    }
    nodesByYear.get(year)!.push(node);
  });
  
  const positionedNodes = [];
  const sortedYears = Array.from(nodesByYear.keys()).sort((a, b) => a - b);
  
  sortedYears.forEach((year, yearIndex) => {
    const yearNodes = nodesByYear.get(year)!;
    const yPosition = rules.baseY + (yearIndex * rules.yearSpacing);
    
    // Position nodes within the year
    yearNodes.forEach((node, nodeIndex) => {
      let xPosition;
      
      if (yearNodes.length === 1) {
        // Single node - center it
        xPosition = rules.columnPositions[Math.floor(rules.columnPositions.length / 2)] || 0;
      } else {
        // Multiple nodes - spread across available columns
        const columnIndex = Math.floor((nodeIndex / yearNodes.length) * rules.columnPositions.length);
        xPosition = rules.columnPositions[columnIndex] || rules.columnPositions[nodeIndex % rules.columnPositions.length];
      }
      
      positionedNodes.push({
        ...node,
        position: { x: xPosition, y: yPosition },
        data: {
          ...node.data,
          hasLearnedLayout: true,
          originalPosition: node.position
        }
      });
    });
  });
  
  console.log('[Learned Layout] Positioned nodes:', {
    totalNodes: positionedNodes.length,
    samplePositions: positionedNodes.slice(0, 3).map(n => ({ id: n.id, pos: n.position }))
  });
  
  return positionedNodes;
}

/**
 * Check if we have manual position data to learn from
 */
export function hasManualLayoutData(): boolean {
  const positions = (window as any).manualPositions;
  return positions && Object.keys(positions).length > 0;
}

/**
 * Get the stored manual positions
 */
export function getManualPositions(): ManualPositionData | null {
  const positions = (window as any).manualPositions;
  return positions && Object.keys(positions).length > 0 ? positions : null;
}