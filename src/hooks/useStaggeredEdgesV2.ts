import { useEffect, useState, useRef } from 'react';
import { Edge, Node } from '@xyflow/react';

interface StaggeredEdgesConfig {
  enabled: boolean;
  batchDelayMs: number;
  emergencyTimeoutMs: number;
}

interface StaggeredEdgesReturn {
  visibleEdges: Edge[];
  isRevealing: boolean;
  forceRevealAll: () => void;
}

export function useStaggeredEdgesV2(
  allEdges: Edge[],
  allNodes: Node[],
  config: StaggeredEdgesConfig = {
    enabled: true,
    batchDelayMs: 800,
    emergencyTimeoutMs: 2000,
  }
): StaggeredEdgesReturn {
  const [visibleEdges, setVisibleEdges] = useState<Edge[]>([]);
  const [isRevealing, setIsRevealing] = useState(false);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const emergencyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const forceRevealAll = () => {
    // Clear all pending timeouts
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    if (emergencyTimeoutRef.current) {
      clearTimeout(emergencyTimeoutRef.current);
      emergencyTimeoutRef.current = null;
    }

    setVisibleEdges(allEdges);
    setIsRevealing(false);
    console.log(`[StaggeredEdgesV2] Force revealed all ${allEdges.length} edges`);
  };

  useEffect(() => {
    // Clear any existing timeouts
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    if (emergencyTimeoutRef.current) {
      clearTimeout(emergencyTimeoutRef.current);
      emergencyTimeoutRef.current = null;
    }

    if (!config.enabled || allEdges.length === 0) {
      setVisibleEdges(allEdges);
      setIsRevealing(false);
      return;
    }

    // Small graphs show all edges immediately
    if (allEdges.length < 6) {
      setVisibleEdges(allEdges);
      setIsRevealing(false);
      console.log(`[StaggeredEdgesV2] Small graph (${allEdges.length} edges) - showing all immediately`);
      return;
    }

    setIsRevealing(true);
    setVisibleEdges([]);

    // Create node position map for column-based batching
    const nodePositionMap = new Map<string, { x: number; y: number }>();
    allNodes.forEach(node => {
      if (node.position) {
        nodePositionMap.set(node.id, node.position);
      }
    });

    // Group edges by source node column (position-based, not ID parsing)
    const edgeBatches = new Map<number, Edge[]>();
    const terminalEdges: Edge[] = [];

    allEdges.forEach(edge => {
      const sourcePos = nodePositionMap.get(edge.source);
      if (!sourcePos) {
        // No position found, put in first batch
        const batch = edgeBatches.get(0) || [];
        batch.push(edge);
        edgeBatches.set(0, batch);
        return;
      }

      // Check if this is a terminal/graduation edge
      const targetNode = allNodes.find(n => n.id === edge.target);
      if (targetNode?.type === 'terminal' || targetNode?.type === 'terminalNode' || 
          edge.target.includes('graduation') || edge.target.includes('terminal')) {
        terminalEdges.push(edge);
        return;
      }

      // Column-based batching using x position (500px per column)
      const column = Math.floor(sourcePos.x / 500);
      const batch = edgeBatches.get(column) || [];
      batch.push(edge);
      edgeBatches.set(column, batch);
    });

    // Sort columns and add terminal edges to the final batch
    const sortedColumns = Array.from(edgeBatches.keys()).sort((a, b) => a - b);
    if (terminalEdges.length > 0) {
      const lastColumn = sortedColumns[sortedColumns.length - 1] || 0;
      const finalBatch = edgeBatches.get(lastColumn) || [];
      finalBatch.push(...terminalEdges);
      edgeBatches.set(lastColumn, finalBatch);
    }

    console.log(`[StaggeredEdgesV2] Created ${sortedColumns.length} batches for ${allEdges.length} edges`);
    console.log(`[StaggeredEdgesV2] Terminal edges: ${terminalEdges.length}`);

    // Set up emergency timeout
    emergencyTimeoutRef.current = setTimeout(() => {
      console.warn(`[StaggeredEdgesV2] Emergency timeout - revealing all ${allEdges.length} edges`);
      forceRevealAll();
    }, config.emergencyTimeoutMs);

    // Reveal batches sequentially
    let cumulativeEdges: Edge[] = [];
    sortedColumns.forEach((column, index) => {
      const batch = edgeBatches.get(column) || [];
      cumulativeEdges = [...cumulativeEdges, ...batch];
      
      const timeout = setTimeout(() => {
        setVisibleEdges([...cumulativeEdges]);
        console.log(`[StaggeredEdgesV2] Revealed batch ${index + 1}/${sortedColumns.length}: ${batch.length} edges (total: ${cumulativeEdges.length})`);
        
        // If this is the last batch, we're done
        if (index === sortedColumns.length - 1) {
          setIsRevealing(false);
          if (emergencyTimeoutRef.current) {
            clearTimeout(emergencyTimeoutRef.current);
            emergencyTimeoutRef.current = null;
          }
        }
      }, index * config.batchDelayMs);

      timeoutsRef.current.push(timeout);
    });

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
      if (emergencyTimeoutRef.current) {
        clearTimeout(emergencyTimeoutRef.current);
        emergencyTimeoutRef.current = null;
      }
    };
  }, [allEdges, allNodes, config.enabled, config.batchDelayMs, config.emergencyTimeoutMs]);

  return {
    visibleEdges,
    isRevealing,
    forceRevealAll,
  };
}