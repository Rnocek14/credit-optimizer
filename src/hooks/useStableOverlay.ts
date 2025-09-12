import { useLayoutEffect, useMemo, useRef, useState } from "react";

type EdgeLike = { id: string; source?: string; target?: string; className?: string };
type NodeLike = { id: string; className?: string };

const EDGE_ID_OK = /^e-.+-.+$/;

export function useStableOverlay<TNode extends NodeLike, TEdge extends EdgeLike>({
  overlayOn,
  baseNodes,
  baseEdges,
  primaryEdgeIds,
  comparisonEdgeIds,
  primaryNodeIds,
  comparisonNodeIds,
  debounceMs = 100,
  logPrefix = "[MP Overlay]",
}: {
  overlayOn: boolean;
  baseNodes: TNode[];
  baseEdges: TEdge[];
  primaryEdgeIds: Set<string>;
  comparisonEdgeIds: Set<string>;
  primaryNodeIds?: Set<string>;
  comparisonNodeIds?: Set<string>;
  debounceMs?: number;
  logPrefix?: string;
}) {
  // Phase 2: normalization gate
  const normalizedEdges = useMemo(
    () => baseEdges.filter(e => EDGE_ID_OK.test(String(e.id))),
    [baseEdges]
  );

  // Track stabilization using edge count; we'll debounce the highlighting
  const lastLenRef = useRef<number>(normalizedEdges.length);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [styledEdges, setStyledEdges] = useState<TEdge[]>(baseEdges);
  const [styledNodes, setStyledNodes] = useState<TNode[]>(baseNodes);

  useLayoutEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!overlayOn) {
      setStyledEdges(baseEdges);
      setStyledNodes(baseNodes);
      return;
    }

    // Phase 2: do not proceed if edges aren't normalized/ready
    if (normalizedEdges.length === 0 && baseEdges.length > 0) {
      // Keep raw graph; avoid "everything dim" when nothing is highlightable yet
      setStyledEdges(baseEdges);
      setStyledNodes(baseNodes);
      if (process.env.NODE_ENV !== "production") {
        console.warn(`${logPrefix}[GATE] Edges not normalized yet; skipping highlight`);
      }
      return;
    }

    // Phase 1: debounce until edges stop fluctuating
    const nowLen = normalizedEdges.length;
    const changed = nowLen !== lastLenRef.current;
    lastLenRef.current = nowLen;

    // Re-arm debounce on any change
    timerRef.current = setTimeout(() => {
      // Phase 3: compute highlights post-commit with a stable snapshot
      const graphEdgeIds = new Set(normalizedEdges.map(e => e.id));
      const primaryFiltered = new Set([...primaryEdgeIds].filter(id => graphEdgeIds.has(id)));
      const comparisonFiltered = new Set([...comparisonEdgeIds].filter(id => graphEdgeIds.has(id)));
      const bothEdgeIds = new Set([...primaryFiltered].filter(id => comparisonFiltered.has(id)));

      if (process.env.NODE_ENV !== "production") {
        console.log(`${logPrefix}[STABLE] edges=${nowLen} primary=${primaryFiltered.size} comparison=${comparisonFiltered.size} both=${bothEdgeIds.size}`);
      }

      const nextEdges = normalizedEdges.map(e => {
        const merged = [e.className, 'edge'].filter(Boolean);
        if (bothEdgeIds.has(e.id))               merged.push('edge--both');
        else if (primaryFiltered.has(e.id))      merged.push('edge--primary');  
        else if (comparisonFiltered.has(e.id))   merged.push('edge--comparison');
        else                                     merged.push('edge--dim');
        return { ...e, className: merged.join(' ') } as TEdge;
      });

      // Handle nodes if provided
      const nextNodes = (baseNodes || []).map(n => {
        const merged = [n.className, 'node'].filter(Boolean);
        const isPrimary = primaryNodeIds?.has(n.id) ?? false;
        const isComparison = comparisonNodeIds?.has(n.id) ?? false;
        
        if (isPrimary && isComparison)     merged.push('node--both');
        else if (isPrimary)               merged.push('node--primary');
        else if (isComparison)            merged.push('node--comparison');
        else                              merged.push('node--dim');
        
        return { ...n, className: merged.join(' ') } as TNode;
      });

      setStyledEdges(nextEdges);
      setStyledNodes(nextNodes);
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [
    overlayOn,
    baseNodes,
    baseEdges,
    normalizedEdges,
    primaryEdgeIds,
    comparisonEdgeIds,
    primaryNodeIds,
    comparisonNodeIds,
    debounceMs,
    logPrefix,
  ]);

  return { nodes: styledNodes, edges: styledEdges };
}

// Edge ID normalization utility
export const normalizeEdgeId = (e: { id?: string; source: string; target: string }) =>
  e.id && /^e-.+-.+$/.test(e.id) ? e.id : `e-${e.source}-${e.target}`;
