import { useEffect, useState, useRef, useMemo } from 'react';
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

  // Memoize the column-batching step for stability
  const { sortedColumns, edgeBatches, terminalEdges } = useMemo(() => {
    const nodePositionMap = new Map(allNodes.map(n => [n.id, n.position]));
    const batches = new Map<number, Edge[]>();
    const terminals: Edge[] = [];

    for (const edge of allEdges) {
      const pos = nodePositionMap.get(edge.source);
      if (!pos) {
        const batch = batches.get(0) || [];
        batch.push(edge);
        batches.set(0, batch);
        continue;
      }
      
      const isTerminal =
        allNodes.find(n => n.id === edge.target)?.type?.toLowerCase().includes('terminal') ||
        edge.target.includes('graduation') ||
        edge.target.includes('terminal') ||
        edge.target === 'degree-completion';

      if (isTerminal) {
        terminals.push(edge);
        continue;
      }

      const col = Math.floor((pos.x ?? 0) / 500); // 500px per column
      const batch = batches.get(col) || [];
      batch.push(edge);
      batches.set(col, batch);
    }

    // Put terminals in last batch
    const cols = Array.from(batches.keys()).sort((a, b) => a - b);
    if (terminals.length) {
      const last = cols.length ? cols[cols.length - 1] : 0;
      const batch = batches.get(last) || [];
      batch.push(...terminals);
      batches.set(last, batch);
      if (!cols.length) cols.push(last);
    }

    return { sortedColumns: cols, edgeBatches: batches, terminalEdges: terminals };
  }, [allEdges, allNodes]);

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

    // Allow staggering even on small graphs (removed threshold)

    setIsRevealing(true);
    setVisibleEdges([]);


    // Dynamically compute emergency timeout based on batch count
    const batchesCount = Math.max(1, sortedColumns.length);
    const totalRevealMs = (batchesCount - 1) * config.batchDelayMs + 400; // 400ms buffer
    const emergencyMs = Math.max(config.emergencyTimeoutMs ?? 2000, totalRevealMs);

    // Set up emergency timeout with dynamic duration
    emergencyTimeoutRef.current = setTimeout(() => {
      console.warn(`[StaggeredEdgesV2] Emergency timeout (${emergencyMs}ms) - revealing all ${allEdges.length} edges`);
      forceRevealAll();
    }, emergencyMs);

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
  }, [allEdges, allNodes, config.enabled, config.batchDelayMs, config.emergencyTimeoutMs, sortedColumns, edgeBatches]);

  // One-time logging per batch configuration change
  useEffect(() => {
    if (config.enabled && allEdges.length > 0) {
      console.log(`[StaggeredEdgesV2] Created ${sortedColumns.length} batches for ${allEdges.length} edges`);
      console.log(`[StaggeredEdgesV2] Terminal edges: ${terminalEdges.length}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedColumns.join(','), allEdges.length, terminalEdges.length, config.enabled]);

  return {
    visibleEdges,
    isRevealing,
    forceRevealAll,
  };
}