import { useState, useCallback, useRef, useEffect } from 'react';
import { Edge, Node } from '@xyflow/react';

interface EdgeBatch {
  column: number;
  edges: Edge[];
}

const COLUMN_WIDTH = 320; // Match layout column width
const STAGGER_DELAY = 80; // ms between batches

export function useStaggeredEdgesV2() {
  const [revealedBatches, setRevealedBatches] = useState<Set<number>>(new Set());
  const [allBatches, setAllBatches] = useState<EdgeBatch[]>([]);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // Cleanup function to clear all timeouts
  const cleanup = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  // Position-based batching that handles non-numeric IDs
  const batchEdgesByColumn = useCallback((edges: Edge[], nodes: Node[]): EdgeBatch[] => {
    const nodeById = new Map(nodes.map(n => [n.id, n]));
    const batchMap = new Map<number, Edge[]>();

    edges.forEach(edge => {
      const sourceNode = nodeById.get(edge.source);
      const x = sourceNode?.position?.x ?? 0;
      const column = Math.round(x / COLUMN_WIDTH);
      
      if (!batchMap.has(column)) {
        batchMap.set(column, []);
      }
      batchMap.get(column)!.push(edge);
    });

    // Ensure terminal edges are in the last batch
    const terminalEdges = edges.filter(e => 
      e.target === 'graduation-terminal' || e.id.includes('terminal-')
    );
    
    if (terminalEdges.length && batchMap.size > 0) {
      const maxColumn = Math.max(...batchMap.keys());
      const lastColumn = maxColumn + 1;
      
      // Remove terminal edges from other batches
      batchMap.forEach(batch => {
        for (let i = batch.length - 1; i >= 0; i--) {
          if (terminalEdges.includes(batch[i])) {
            batch.splice(i, 1);
          }
        }
      });
      
      // Add terminal edges to last batch
      batchMap.set(lastColumn, terminalEdges);
    }

    return Array.from(batchMap.entries())
      .map(([column, edges]) => ({ column, edges }))
      .sort((a, b) => a.column - b.column)
      .filter(batch => batch.edges.length > 0); // Remove empty batches
  }, []);

  const revealEdgesInBatches = useCallback((
    edges: Edge[], 
    nodes: Node[], 
    onBatchComplete?: () => void
  ) => {
    cleanup(); // Clear any existing timeouts

    try {
      const batches = batchEdgesByColumn(edges, nodes);
      setAllBatches(batches);

      // Fallback: if less than 2 meaningful batches or small graph, show all immediately
      if (batches.length < 2 || edges.length < 6) {
        console.log('[StaggeredEdges] Small graph detected, showing all edges immediately');
        setRevealedBatches(new Set(batches.map(b => b.column)));
        onBatchComplete?.();
        return batches;
      }

      // Clear previous reveals and start staggered reveal
      setRevealedBatches(new Set());

      batches.forEach((batch, index) => {
        const timeout = setTimeout(() => {
          setRevealedBatches(prev => new Set([...prev, batch.column]));
          
          // Call completion callback on last batch
          if (index === batches.length - 1 && onBatchComplete) {
            setTimeout(onBatchComplete, 50);
          }
        }, index * STAGGER_DELAY);
        
        timeoutsRef.current.push(timeout);
      });

      return batches;
    } catch (error) {
      console.error('[StaggeredEdges] Error during batching, falling back to immediate reveal:', error);
      // Error fallback: show all edges immediately
      const allColumns = new Set(
        edges.map(e => {
          const sourceNode = nodes.find(n => n.id === e.source);
          return Math.round((sourceNode?.position?.x ?? 0) / COLUMN_WIDTH);
        })
      );
      setRevealedBatches(allColumns);
      onBatchComplete?.();
      return [];
    }
  }, [batchEdgesByColumn, cleanup]);

  const shouldShowEdge = useCallback((edge: Edge, nodes: Node[]): boolean => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const column = Math.round((sourceNode?.position?.x ?? 0) / COLUMN_WIDTH);
    return revealedBatches.has(column);
  }, [revealedBatches]);

  const reset = useCallback(() => {
    cleanup();
    setRevealedBatches(new Set());
    setAllBatches([]);
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    revealEdgesInBatches,
    shouldShowEdge,
    reset,
    batches: allBatches,
    revealedBatches, // Expose the revealed batches state
    isInitialized: revealedBatches.size > 0 // Track if system has started
  };
}