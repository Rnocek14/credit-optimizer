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
  const lastLogKeyRef = useRef<string>('');
  const scheduledKeyRef = useRef<string | null>(null);

  // RAF-aligned reveal to avoid jank
  const reveal = (edges: Edge[]) => {
    requestAnimationFrame(() => setVisibleEdges(edges));
  };

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
    if (import.meta.env.DEV) {
      console.log(`[StaggeredEdgesV2] Force revealed all ${allEdges.length} edges`);
    }
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
    // StrictMode guard - prevent duplicate scheduling
    const key = `${sortedColumns.join(',')}|${allEdges.length}|${config.batchDelayMs}`;
    if (scheduledKeyRef.current === key) return;
    scheduledKeyRef.current = key;

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

    setIsRevealing(true);
    setVisibleEdges([]);

    // Create batch arrays for sequential reveal
    const batchesInOrder: Edge[][] = sortedColumns.map(c => edgeBatches.get(c) || []);

    // Sub-batch single column graphs to create animation waves
    if (batchesInOrder.length === 1 && batchesInOrder[0].length > 1) {
      const batch = batchesInOrder[0];
      const mid = Math.ceil(batch.length / 2);
      batchesInOrder.splice(0, 1, batch.slice(0, mid), batch.slice(mid));
    }

    // Guard against 0 batches
    if (batchesInOrder.length === 0) {
      setVisibleEdges(allEdges);
      setIsRevealing(false);
      return;
    }

    // Optimize delay for small graphs
    const delay = batchesInOrder.length <= 2 ? Math.min(config.batchDelayMs, 450) : config.batchDelayMs;

    // Dynamically compute emergency timeout with minimum floor
    const totalRevealMs = (batchesInOrder.length - 1) * delay + 400;
    const emergencyMs = Math.max(
      config.emergencyTimeoutMs ?? 2000,
      totalRevealMs,
      1200 // minimum safety
    );

    // Set up emergency timeout with dynamic duration (only warn if it actually fires)
    emergencyTimeoutRef.current = setTimeout(() => {
      console.warn(`[StaggeredEdgesV2] Emergency timeout (${emergencyMs}ms) - revealing all ${allEdges.length} edges`);
      forceRevealAll();
    }, emergencyMs);

    // Reveal batches sequentially
    let cumulativeEdges: Edge[] = [];
    batchesInOrder.forEach((batch, index) => {
      cumulativeEdges = [...cumulativeEdges, ...batch];
      
      const timeout = setTimeout(() => {
        reveal([...cumulativeEdges]);
        if (import.meta.env.DEV) {
          console.log(`[StaggeredEdgesV2] Revealed batch ${index + 1}/${batchesInOrder.length}: ${batch.length} edges (total: ${cumulativeEdges.length})`);
        }
        
        // If this is the last batch, we're done
        if (index === batchesInOrder.length - 1) {
          setIsRevealing(false);
          if (emergencyTimeoutRef.current) {
            clearTimeout(emergencyTimeoutRef.current);
            emergencyTimeoutRef.current = null;
          }
        }
      }, index * delay);

      timeoutsRef.current.push(timeout);
    });

    return () => {
      scheduledKeyRef.current = null;
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
      if (emergencyTimeoutRef.current) {
        clearTimeout(emergencyTimeoutRef.current);
        emergencyTimeoutRef.current = null;
      }
    };
  }, [allEdges, allNodes, config.enabled, config.batchDelayMs, config.emergencyTimeoutMs, sortedColumns, edgeBatches]);

  // Stable one-time logging per batch configuration change
  useEffect(() => {
    if (!config.enabled || allEdges.length === 0) return;
    
    const batchKey = `${sortedColumns.join(',')}|${allEdges.length}|${terminalEdges.length}`;
    if (lastLogKeyRef.current === batchKey) return;
    
    lastLogKeyRef.current = batchKey;
    if (import.meta.env.DEV) {
      console.log(`[StaggeredEdgesV2] Created ${sortedColumns.length} batches for ${allEdges.length} edges`);
      console.log(`[StaggeredEdgesV2] Terminal edges: ${terminalEdges.length}`);
    }
  }, [sortedColumns, allEdges.length, terminalEdges.length, config.enabled]);

  return {
    visibleEdges,
    isRevealing,
    forceRevealAll,
  };
}