import { useState, useCallback } from 'react';
import { Edge } from '@xyflow/react';

interface EdgeBatch {
  column: number;
  edges: Edge[];
}

export function useStaggeredEdges() {
  const [revealedBatches, setRevealedBatches] = useState<Set<number>>(new Set());

  const revealEdgesInBatches = useCallback((edges: Edge[], onBatchComplete?: () => void) => {
    // Group edges by column (approximate)
    const batchMap = new Map<number, Edge[]>();
    
    edges.forEach(edge => {
      // Use source node position to determine column
      const sourceId = edge.source;
      // Estimate column from node ID or use sequential batching
      const column = Math.floor(parseInt(sourceId) / 3) || 0;
      
      if (!batchMap.has(column)) {
        batchMap.set(column, []);
      }
      batchMap.get(column)!.push(edge);
    });

    const batches: EdgeBatch[] = Array.from(batchMap.entries())
      .map(([column, edges]) => ({ column, edges }))
      .sort((a, b) => a.column - b.column);

    // Clear previous reveals
    setRevealedBatches(new Set());

    // Reveal batches with staggered timing
    batches.forEach((batch, index) => {
      setTimeout(() => {
        setRevealedBatches(prev => new Set([...prev, batch.column]));
        
        // Call completion callback on last batch
        if (index === batches.length - 1 && onBatchComplete) {
          setTimeout(onBatchComplete, 50);
        }
      }, index * 80); // 80ms between batches
    });

    return batches;
  }, []);

  const shouldShowEdge = useCallback((edge: Edge): boolean => {
    const sourceId = edge.source;
    const column = Math.floor(parseInt(sourceId) / 3) || 0;
    return revealedBatches.has(column);
  }, [revealedBatches]);

  const reset = useCallback(() => {
    setRevealedBatches(new Set());
  }, []);

  return {
    revealEdgesInBatches,
    shouldShowEdge,
    reset
  };
}