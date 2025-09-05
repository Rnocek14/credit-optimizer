import React, { useMemo, useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  Position,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import '@/styles/lifePath.css';
import { determineNodeGhostStatus } from '@/lib/pathfinding/ghosting';
import { LifePathGraph, useLifePathGraph } from '@/hooks/useLifePathGraph';
import { GraphNode, PathfindingResult } from '@/types/lifePathGraph';
import { LifePathNodeComponent } from './LifePathNode';
import { LifePathEdgeComponent } from './LifePathEdge';
import { BranchDecisionCard } from './BranchDecisionCard';
import { InstitutionLane } from './InstitutionLane';
import { EducationalBands } from './EducationalBands';
import { CALM_LANES } from '@/components/calm/LaneBackground';
import { MetricsPill } from '@/components/ui/metrics-pill';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { styleEdge, getNodeColorByType, getNodeBorderColorByType, calculateNodePosition, determineEdgeTier, determineNodeTier } from '@/lib/pathfinding/visualization';
import { applyUnifiedLayoutV3, layoutAndScan, assertTierEdgeParity, type Graph as LayoutGraph } from '@/lib/layout/unifiedLayoutV3';
import { Eye, EyeOff, Zap, DollarSign, BookOpen, BarChart3 } from 'lucide-react';

/* RUNTIME AUDIT PANEL – BEGIN */
type AuditPhase = 'S' | 'A' | 'B' | 'C';
type PresetKey = 'fastest' | 'cheapest' | 'creditMaximized' | 'balanced';

function toJSON(v: any) {
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}
/* RUNTIME AUDIT PANEL – END */

// ---------- VISUAL V2 FEATURE FLAG ----------
import { LP_VISUAL_V2 } from '@/lib/flags';
import { VisualScanner } from './VisualScanner';
import { TierClassManager } from './TierClassManager';
import { getLiveNodeBoxes, snapToGrid } from '@/lib/pathfinding/coordinateHelpers';
import { snapToLanes, nudgeOverlaps } from '@/lib/pathfinding/layoutHelpers';
import { findClearMidColumn } from '@/lib/pathfinding/midColumnUtils';

// ---------- SAFE RENDER MODE (now dynamic via audit panel) ----------

const nodeTypes = {
  lifePathNode: LifePathNodeComponent,
};

const edgeTypes = {
  lifePathEdge: LifePathEdgeComponent,
};

interface LifePathCanvasProps {
  graph: LifePathGraph;
  pathfindingResult?: PathfindingResult | null;
  onNodeClick?: (node: GraphNode) => void;
  selectedNode?: GraphNode | null;
  findPaths?: (goalId: string) => void;
  activeGoal?: string;
}

export default function LifePathCanvas({ 
  graph, 
  pathfindingResult, 
  onNodeClick, 
  selectedNode,
  findPaths,
  activeGoal 
}: LifePathCanvasProps) {
  console.log('🔧 LifePathCanvas: Attempting to use useReactFlow hook');
  const reactFlowInstance = useReactFlow();
  console.log('✅ LifePathCanvas: useReactFlow hook successful', { reactFlowInstance });
  
  // Get tierOfEdge from hook for consistency
  const { tierOfEdge, activePath: hookActivePath } = useLifePathGraph();
  /* RUNTIME AUDIT PANEL – BEGIN */
  const [auditRunning, setAuditRunning] = React.useState(false);
  const [auditLog, setAuditLog] = React.useState<string>('');
  const [auditReport, setAuditReport] = React.useState<any>(null);
  
  
  // Smart phase defaulting: C in production, S in dev (unless ?audit=1)
  const getDefaultPhase = (): AuditPhase => {
    if (typeof window === 'undefined') return 'S';
    const searchParams = new URLSearchParams(window.location.search);
    if (process.env.NODE_ENV === 'production' && !searchParams.has('audit')) {
      return 'C';
    }
    return 'S';
  };
  
  const [phase, setPhase] = React.useState<AuditPhase>(getDefaultPhase());

  // Expose safe flags via state so we can flip them from the panel.
  // IMPORTANT: wire these into the booleans you currently use (SAFE_RENDER, SAFE_SHOW_GHOSTS, SAFE_DISABLE_FILTERING)
  // Replace your hard-coded constants with these computed values:
  const SAFE_RENDER_FLAG = phase === 'S' || phase === 'A' ? true : false;        // S/A: true, B/C: false
  const SAFE_DISABLE_FILTERING_FLAG = phase === 'S' ? true : false;              // S: true, A/B/C: false
  const SAFE_SHOW_GHOSTS_FLAG = phase === 'C' ? false : true;                    // C: false, others: true

  function log(line: string) {
    setAuditLog(prev => prev + (prev ? '\n' : '') + line);
  }

  function countByTestId(id: string) {
    return (document.querySelectorAll(`[data-testid="${id}"]`) || []).length;
  }

  function sampleDOM() {
    const q = (s: string) => document.querySelectorAll(s).length;
    return {
      nodes: countByTestId('lp-node'),
      edges: countByTestId('lp-edge'),
      stepBadges: countByTestId('lp-step-badge'),
      transferLabels: countByTestId('lp-edge-label'),
      edgeTiers: LP_VISUAL_V2 ? {
        on: q('.lp-edge-on-path'),
        related: q('.lp-edge-related'),
        off: q('.lp-edge-off-path')
      } : { on: 0, related: 0, off: 0 },
      nodeTiers: LP_VISUAL_V2 ? {
        on: q('.lp-node-on-path, [data-testid="lp-node"].lp-node-on-path'),
        related: q('.lp-node-related, [data-testid="lp-node"].lp-node-related'),
        off: q('.lp-node-off-path, [data-testid="lp-node"].lp-node-off-path')
      } : { on: 0, related: 0, off: 0 }
    };
  }

  function exportAuditJSON() {
    if (!auditReport) return;
    const blob = new Blob([JSON.stringify(auditReport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skilltree3-audit-phase-${phase}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function clickPreset(p: PresetKey) {
    const btn = document.querySelector(`[data-testid="lp-preset-${p}"]`) as HTMLButtonElement | null;
    if (btn) btn.click();
    await new Promise(r => setTimeout(r, 400));
    return sampleDOM();
  }

  async function runAudit() {
    setAuditRunning(true);
    setAuditLog('');
    setAuditReport(null);

    log(`Phase ${phase} starting…`);
    log(`Flags → SAFE_RENDER=${SAFE_RENDER_FLAG}, SAFE_SHOW_GHOSTS=${SAFE_SHOW_GHOSTS_FLAG}, SAFE_DISABLE_FILTERING=${SAFE_DISABLE_FILTERING_FLAG}`);

    const t0 = sampleDOM();
    log(`t=0s → ${toJSON(t0)}`);

    await new Promise(r => setTimeout(r, 6000));
    const t6 = sampleDOM();
    log(`t=6s → ${toJSON(t6)}`);

    await new Promise(r => setTimeout(r, 6000));
    const t12 = sampleDOM();
    log(`t=12s → ${toJSON(t12)}`);

    const presets: PresetKey[] = ['fastest','cheapest','creditMaximized','balanced'];
    const presetResults: any[] = [];
    for (const p of presets) {
      const res = await clickPreset(p);
      presetResults.push({
        preset: p,
        nodeCount: res.nodes,
        edgeCount: res.edges,
        activePathLen: res.stepBadges,
      });
      log(`Preset ${p} → ${toJSON(presetResults[presetResults.length-1])}`);
    }

    const report = {
      phase,
      flags: {
        SAFE_RENDER: SAFE_RENDER_FLAG,
        SAFE_SHOW_GHOSTS: SAFE_SHOW_GHOSTS_FLAG,
        SAFE_DISABLE_FILTERING: SAFE_DISABLE_FILTERING_FLAG,
      },
      domCounts: { t0, t6, t12 },
      stability: {
        nodeCountStable: t0.nodes === t6.nodes && t6.nodes === t12.nodes,
        edgeCountStable: t0.edges === t6.edges && t6.edges === t12.edges,
      },
      presets: presetResults,
      transferLabelsFound: t12.transferLabels,
      notes: 'Audit completed in-page.',
    };

    setAuditReport(report);
    log('FINAL REPORT →\n' + toJSON(report));
    setAuditRunning(false);
  }

  /* RUNTIME AUDIT PANEL – END */

  const [showGhosts, setShowGhosts] = useState(SAFE_SHOW_GHOSTS_FLAG);
  const [activePreset, setActivePreset] = useState<'fastest' | 'cheapest' | 'creditMaximized' | 'balanced'>('fastest');
  const [branchDecisions, setBranchDecisions] = useState<any[]>([]);
  const [previousPath, setPreviousPath] = useState<string[]>([]);
  const [showPreviousPath, setShowPreviousPath] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Quick safety toggle (optional, but handy) - auto-enable V2 in dev
  useEffect(() => {
    if (import.meta.env.DEV) {
      try { localStorage.setItem('LP_VISUAL_V2', '1'); } catch {}
    }
  }, []);

  // Auto-trigger pathfinding when preset changes or on initial load (debounced)
  useEffect(() => {
    if (!findPaths || !activeGoal || graph.nodes.length === 0) return;
    
    const timeoutId = setTimeout(() => {
      console.log(`[LifePathCanvas] Auto-triggering pathfinding for preset: ${activePreset}, goal: ${activeGoal}`);
      findPaths(activeGoal);
    }, 300); // 300ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [activePreset, activeGoal, findPaths, graph.nodes.length]);

  // Calculate overlap counts for nodes used in multiple paths
  const overlapCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!pathfindingResult) return counts;
    
    // Count usage across all paths
    const paths = [
      pathfindingResult.fastest,
      pathfindingResult.cheapest, 
      pathfindingResult.creditMaximized,
      pathfindingResult.recommendations?.primary
    ].filter(Boolean);
    
    paths.forEach(path => {
      path?.nodeIds.forEach(nodeId => {
        counts[nodeId] = (counts[nodeId] || 0) + 1;
      });
    });
    
    return counts;
  }, [pathfindingResult]);

  // Get current active path with edge IDs
  const activePath = useMemo(() => {
    if (!pathfindingResult) return null;
    switch (activePreset) {
      case 'fastest': return pathfindingResult.fastest;
      case 'cheapest': return pathfindingResult.cheapest;
      case 'creditMaximized': return pathfindingResult.creditMaximized;
      case 'balanced': return pathfindingResult.recommendations.primary;
      default: return pathfindingResult.fastest;
    }
  }, [pathfindingResult, activePreset]);

  // Transition memory: show previous path as ghost when switching presets
  useEffect(() => {
    if (activePath?.nodeIds && activePath.nodeIds.length > 0) {
      const currentPathString = activePath.nodeIds.join(',');
      const previousPathString = previousPath.join(',');
      
      if (previousPath.length > 0 && currentPathString !== previousPathString) {
        setShowPreviousPath(true);
        const timer = setTimeout(() => setShowPreviousPath(false), 1500); // 1.5s fade
        return () => clearTimeout(timer);
      }
      
      setPreviousPath(activePath.nodeIds);
    }
  }, [activePath?.nodeIds]);

  // ---- Active goal / discipline ----
  const activeGoalId = activePath?.nodeIds?.[activePath.nodeIds.length - 1] ?? null;
  const activeGoalNode = activeGoalId ? graph.nodes.find(n => n.id === activeGoalId) : undefined;

  const activeDiscipline =
    activeGoalNode?.tags?.find(t =>
      ['cs', 'computer-science', 'nursing', 'business'].includes(t.toLowerCase())
    ) ?? null;

  // Helper: shared trunk nodes should always stay
  const isShared = (n: GraphNode) =>
    n.type === 'skill' ||
    n.type === 'creditBlock' ||
    n.tags?.includes('shared') ||
    n.tags?.includes('gen-ed');

  // IMPORTANT: if path is empty, DO NOT filter or hide anything
  const safeActivePath = activePath && Array.isArray(activePath.nodeIds) ? activePath : { nodeIds: [] };
  const isPathEmpty = safeActivePath.nodeIds.length === 0;

  // Helper for later (but we'll bypass while SAFE_DISABLE_FILTERING is true)
  const getActiveDiscipline = () => {
    const goalId = safeActivePath.nodeIds[safeActivePath.nodeIds.length - 1];
    const goal = graph.nodes.find(n => n.id === goalId);
    const tag = goal?.tags?.find(t => ['cs','computer-science','nursing','business'].includes(t.toLowerCase()));
    return tag || null;
  };

  // Base nodes (NO FILTERING in safe mode)
  const baseNodes = useMemo(() => {
    if (SAFE_DISABLE_FILTERING_FLAG || isPathEmpty) return graph.nodes;
    const activeDiscipline = getActiveDiscipline();
    const isShared = (n: any) =>
      n.type === 'skill' || n.type === 'creditBlock' || n.tags?.includes('shared') || n.tags?.includes('gen-ed');
    const filtered = graph.nodes.filter(n => {
      if (isShared(n)) return true;
      if (safeActivePath.nodeIds.includes(n.id)) return true;
      if (!activeDiscipline) return true;
      return n.tags?.some((t: string) => t.toLowerCase().includes(activeDiscipline.toLowerCase()));
    });
    return filtered.length ? filtered : graph.nodes;
  }, [graph.nodes, isPathEmpty, pathfindingResult]);

  // Telemetry (concise in production)
  useEffect(() => {
    const activePathLen = activePath?.nodeIds?.length || 0;
    if (process.env.NODE_ENV === 'production') {
      console.info(`[life-path] nodes=${graph.nodes.length} edges=${graph.edges.length} preset=${activePreset} activeGoal=${activeGoal} activePathLen=${activePathLen}`);
    } else {
      console.info('[life-path] nodes:', graph.nodes.length, 'edges:', graph.edges.length);
      console.info('[life-path] activePath length:', activePathLen);
      console.info('[life-path] baseNodes length:', baseNodes.length);
      console.info('[life-path] preset:', activePreset, 'activeGoal:', activeGoal);
    }
  }, [graph.nodes.length, graph.edges.length, activePath?.nodeIds?.length, baseNodes.length, activePreset, activeGoal]);

  // Create stable path string for memoization
  const activePathString = useMemo(() => 
    safeActivePath.nodeIds.join(','), 
    [safeActivePath.nodeIds]
  );

  // Build LayoutGraph once
  const layoutInput: LayoutGraph = useMemo(() => ({
    nodes: (graph.nodes || []).map(n => ({
      id: String(n.id),
      label: n.title || String(n.id),
      lane: n.type === 'creditBlock' ? 'Transfer' : 'Core',
      width: 220,
      height: 88,
      data: n,
    })),
    edges: (graph.edges || []).map(e => ({
      id: String(e.id),
      source: String(e.sourceId),
      target: String(e.targetId),
      kind:
        e.type === 'requires' ? 'requires' :
        e.type === 'enables'  ? 'teaches'  :
        e.type === 'creditTransfersTo' ? 'credit_transfer' :
        'related',
      credit: e.type === 'creditTransfersTo' ? {
        source: 'ACE' as any,
        units: e.creditTransferRate ? Math.round(e.creditTransferRate * 100) : undefined,
        institution: e.metadata?.institution
      } : undefined,
      data: e,
    })),
  }), [graph.nodes, graph.edges]);

  // Run layout ONCE
  const laidGraphMemo = useMemo(() => {
    const { graph: laid, scan } = layoutAndScan(
      layoutInput,
      { hGap: 320, vGap: 28, laneOrder: ['Core','Electives','Transfer','Orphan'] },
      activePath?.edgeIds || []
    );
    if (import.meta.env.DEV) console.log('[SCAN SUMMARY]', scan.summary);
    return laid;
  }, [layoutInput, activePath?.edgeIds?.join(',')]);

  // Use laidGraphMemo for nodes
  const reactFlowNodes: Node[] = useMemo(() => laidGraphMemo.nodes.map(n => {
    const nodeTier = LP_VISUAL_V2 ? determineNodeTier(n.id, safeActivePath.nodeIds, graph.edges) : undefined;
    const isInMainPath = safeActivePath.nodeIds.includes(n.id);
    const stepNumber = isInMainPath ? safeActivePath.nodeIds.indexOf(n.id) + 1 : undefined;

    return {
      id: n.id,
      position: { x: n.x!, y: n.y! },
      data: { 
        ...n.data,
        node: n.data,
        isSelected: selectedNode?.id === n.id,
        isInPath: isInMainPath,
        isMainPath: isInMainPath,
        stepNumber,
        tier: nodeTier,
        isHovered: hoveredNode === n.id,
        showPreviousPath: showPreviousPath && previousPath.includes(n.id) && !safeActivePath.nodeIds.includes(n.id),
      },
      type: 'lifePathNode',
      style: {
        opacity: 1,
        zIndex: isInMainPath ? 10 : 1,
      },
      className: LP_VISUAL_V2 && nodeTier ? `lp-node-${nodeTier}` : '',
      sourcePosition: LP_VISUAL_V2 ? Position.Right : Position.Bottom,
      targetPosition: LP_VISUAL_V2 ? Position.Left : Position.Top,
      hidden: false,
      draggable: false,
    };
  }), [laidGraphMemo, safeActivePath.nodeIds, selectedNode, hoveredNode, showPreviousPath, previousPath, LP_VISUAL_V2, graph.edges]);

  // Use laidGraphMemo for edges
  const reactFlowEdges: Edge[] = useMemo(() => {
    const visible = new Set(reactFlowNodes.map(n => n.id));
    return laidGraphMemo.edges
      .filter(e => visible.has(e.source) && visible.has(e.target))
      .map(e => {
        const tier = tierOfEdge({ id: e.id, source: e.source, target: e.target }, activePath);
        const isRelatedToHovered = !!hoveredNode && (e.source === hoveredNode || e.target === hoveredNode);
        
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          type: 'lifePathEdge',
          data: {
            ...e.data,
            tier,
            edgeLabel: e.kind === 'credit_transfer' ? (e.badge?.text || e.data?.label || 'Transfer') : e.data?.label,
            badge: e.badge,
            points: e.points, // polyline from router
            isRelatedToHovered,
            showPreviousPath: showPreviousPath &&
              previousPath.some(id => [e.source, e.target].includes(id)) &&
              !safeActivePath.nodeIds.some(id => [e.source, e.target].includes(id)),
          },
          className: tier ? `lp-edge-${tier}` : undefined,
          style: {
            ...styleEdge(
              e.kind === 'requires' ? 'requires' :
              e.kind === 'teaches'  ? 'enables' :
              e.kind === 'credit_transfer' ? 'creditTransfersTo' : 'enables'
            ),
            ...(e.style || {}), // keep dashed for credit
            opacity: tier === 'off-path' ? 0.3 : (hoveredNode && (e.source === hoveredNode || e.target === hoveredNode)) ? 1 : 0.8,
            strokeWidth: tier === 'on-path' ? 3 : (tier === 'related' ? 2 : 1),
            stroke: tier === 'on-path'
              ? 'hsl(var(--primary) / 0.9)'
              : (tier === 'related' ? 'hsl(var(--primary) / 0.6)' : 'hsl(var(--muted-foreground) / 0.4)'),
          },
        };
      });
  }, [laidGraphMemo, reactFlowNodes, activePath?.id, (activePath?.edgeIds||[]).join(','), hoveredNode, showPreviousPath, previousPath.join(','), tierOfEdge, safeActivePath.nodeIds]);

  // Debug logging for tier counts
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const totals = reactFlowEdges.reduce((a, e) => {
      const t = e.data?.tier;
      if (t === 'on-path') a.on++;
      else if (t === 'related') a.rel++;
      else if (t === 'off-path') a.off++;
      return a;
    }, { on: 0, rel: 0, off: 0 });
    console.log('[TIERS]', totals, 'edges:', reactFlowEdges.length,
                'expectedOn≈', activePath?.edgeIds?.length ?? 0);
    if ((activePath?.edgeIds?.length ?? 0) && totals.on !== activePath!.edgeIds!.length) {
      console.warn('[TIER MISMATCH] expected on:', activePath!.edgeIds!.length, 'actual:', totals.on);
    }
  }, [reactFlowEdges, activePath?.edgeIds?.join(','), activePath?.metadata?.materializedNodes?.join('|')]);

  // Output final acceptance gate status
  useEffect(() => {
    if (import.meta.env.DEV && LP_VISUAL_V2 && pathfindingResult) {
      const timer = setTimeout(() => {
        // Run a quick DOM scan for gate verification
        const tiers = {
          edgeOn: document.querySelectorAll('.lp-edge-on-path, path[data-tier="on-path"], .react-flow__edge-path.lp-edge-on-path').length,
          edgeRelated: document.querySelectorAll('.lp-edge-related, path[data-tier="related"], .react-flow__edge-path.lp-edge-related').length,
          edgeOff: document.querySelectorAll('.lp-edge-off-path, path[data-tier="off-path"], .react-flow__edge-path.lp-edge-off-path').length,
        };
        
        const labels = document.querySelectorAll('[data-testid="lp-edge-label"]').length;
        const totalTiers = tiers.edgeOn + tiers.edgeRelated + tiers.edgeOff;
        
        console.info(`[V2 Status] Preset: ${activePreset}`, {
          "visualV2": {
            "tiers": `${tiers.edgeOn}/${tiers.edgeRelated}/${tiers.edgeOff}`,
            "totalTiers": totalTiers,
            "labels": labels,
            "tiersDetected": totalTiers > 0 ? "✅" : "❌",
            "labelsPresent": labels > 0 ? "✅" : "❌",
            "presetsChecked": [activePreset],
            "status": (totalTiers > 0 && labels > 0) ? "READY_FOR_SCAN" : "NEEDS_ATTENTION"
          }
        });
      }, 1000); // Allow time for DOM to stabilize
      
      return () => clearTimeout(timer);
    }
  }, [activePreset, pathfindingResult, LP_VISUAL_V2]);

  // Click handler
  const handleNodeClick = useCallback((_, node: Node) => {
    const g = graph.nodes.find(n => n.id === node.id);
    if (g && onNodeClick) onNodeClick(g);
  }, [graph.nodes, onNodeClick]);

  const handleNodeMouseEnter = useCallback((_, node: Node) => {
    setHoveredNode(node.id);
  }, []);

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredNode(null);
  }, []);

  // Safety UI if something goes wrong
  if (!reactFlowNodes.length) {
    console.warn('[life-path] No nodes to render — showing fallback note.');
    return <div className="p-6 text-sm text-amber-700 bg-amber-50 rounded">
      No nodes available to display (Safe Render Mode). Check console for details.
    </div>;
  }

  return (
    <div className="w-full space-y-4">
      {/* Controls Header */}
      <div className="flex items-center justify-between p-4 bg-card rounded-lg border">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Main Path Mode</h3>
          <Badge variant="outline">Phase 1</Badge>
        </div>
        
        {/* View Chip */}
        {activePath && (
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
            View: Path ({activePath.nodeIds.length}/{graph.nodes.length})
          </Badge>
        )}
        
        {/* Preset Chips */}
        <div className="flex items-center gap-2">
          <Button
            variant={activePreset === 'fastest' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setActivePreset('fastest');
              if (findPaths && activeGoal) findPaths(activeGoal);
            }}
            data-testid="lp-preset-fastest"
          >
            <Zap className="w-4 h-4 mr-1" />
            Fastest
          </Button>
          <Button
            variant={activePreset === 'cheapest' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setActivePreset('cheapest');
              if (findPaths && activeGoal) findPaths(activeGoal);
            }}
            data-testid="lp-preset-cheapest"
          >
            <DollarSign className="w-4 h-4 mr-1" />
            Cheapest
          </Button>
          <Button
            variant={activePreset === 'creditMaximized' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setActivePreset('creditMaximized');
              if (findPaths && activeGoal) findPaths(activeGoal);
            }}
            data-testid="lp-preset-creditMaximized"
          >
            <BookOpen className="w-4 h-4 mr-1" />
            Credit-Max
          </Button>
          <Button
            variant={activePreset === 'balanced' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setActivePreset('balanced');
              if (findPaths && activeGoal) findPaths(activeGoal);
            }}
            data-testid="lp-preset-balanced"
          >
            <BarChart3 className="w-4 h-4 mr-1" />
            Balanced
          </Button>
          
          <div className="w-px h-6 bg-border mx-2" />
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowGhosts(!showGhosts)}
          >
            {showGhosts ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
            {showGhosts ? 'Hide' : 'Show'} Alternatives
          </Button>
        </div>
      </div>

{/* RUNTIME AUDIT PANEL – BEGIN */}
{(import.meta.env.DEV || (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('audit'))) && (
<div className="mt-4 rounded-xl border p-3 bg-white/70 dark:bg-neutral-900/70">
  <div className="font-semibold mb-2">Runtime Visual Audit</div>

  <div className="flex items-center gap-2 mb-2">
    <span className="text-sm">Phase:</span>
    <button data-testid="audit-phase-s" className={`px-2 py-1 rounded ${phase==='S'?'bg-black text-white dark:bg-white dark:text-black':'bg-gray-200 dark:bg-neutral-700'}`} onClick={() => setPhase('S')} title="Safe: render ON, showGhosts ON, filtering OFF">S</button>
    <button data-testid="audit-phase-a" className={`px-2 py-1 rounded ${phase==='A'?'bg-black text-white dark:bg-white dark:text-black':'bg-gray-200 dark:bg-neutral-700'}`} onClick={() => setPhase('A')} title="Filtering ON">A</button>
    <button data-testid="audit-phase-b" className={`px-2 py-1 rounded ${phase==='B'?'bg-black text-white dark:bg-white dark:text-black':'bg-gray-200 dark:bg-neutral-700'}`} onClick={() => setPhase('B')} title="Normal render ON">B</button>
    <button data-testid="audit-phase-c" className={`px-2 py-1 rounded ${phase==='C'?'bg-black text-white dark:bg-white dark:text-black':'bg-gray-200 dark:bg-neutral-700'}`} onClick={() => setPhase('C')} title="Ghost hiding allowed">C</button>

    <button className="ml-auto px-3 py-1 rounded border" onClick={runAudit} disabled={auditRunning}>
      {auditRunning ? 'Running…' : 'Run Audit'}
    </button>
    
    {process.env.NODE_ENV !== 'production' && auditReport && (
      <button className="ml-2 px-3 py-1 rounded border" onClick={exportAuditJSON}>
        Export JSON
      </button>
    )}
  </div>

  <div className="text-xs opacity-70 mb-2">
    S = Safe (render ON, showGhosts ON, filtering OFF) • A = Filtering ON • B = Normal render ON • C = Ghost hiding allowed
  </div>

  <div className="rounded border p-2 text-xs mb-2 bg-neutral-50 dark:bg-neutral-800">
    <div className="font-medium mb-1">Live Snapshot</div>
    <div className="mb-2">
      Nodes: {typeof document !== 'undefined' ? document.querySelectorAll('[data-testid="lp-node"]').length : 0} •{' '}
      Edges: {typeof document !== 'undefined' ? document.querySelectorAll('[data-testid="lp-edge"]').length : 0} •{' '}
      Steps: {typeof document !== 'undefined' ? document.querySelectorAll('[data-testid="lp-step-badge"]').length : 0}
    </div>
    <pre className="whitespace-pre-wrap">{auditLog}</pre>
  </div>

  <div className="rounded border p-2 text-xs bg-neutral-50 dark:bg-neutral-800">
    <div className="font-medium mb-1">Final Report (JSON)</div>
    <pre className="whitespace-pre-wrap">
      {auditReport ? toJSON(auditReport) : 'Run the audit to generate a report…'}
    </pre>
  </div>

</div>
)}
{/* RUNTIME AUDIT PANEL – END */}

{/* INDEPENDENT VISUAL SCANNER - Always visible for debugging */}
<VisualScanner 
  graph={graph}
  pathfindingResult={pathfindingResult}
  activePreset={activePreset}
  reactFlowEdges={reactFlowEdges}
/>
      
        {/* Metrics Pill */}
      <div className="flex items-center gap-4">
        {safeActivePath && (
          <MetricsPill 
            metrics={{
              totalTime: activePath?.totalTime || 24,
              totalCost: activePath?.totalCost || 8000,
              totalCredits: activePath?.totalCredits || 60,
              creditLoss: activePath?.creditLoss || 0,
              institutionsCount: activePath?.metadata?.institutionsCount,
              prerequisitesSatisfied: activePath?.metadata?.prerequisitesSatisfied,
            }}
          />
        )}
        {process.env.NODE_ENV !== 'production' && (
          <Badge variant="outline" className="text-xs">
            Path: {safeActivePath?.nodeIds?.length || 0} • Nodes: {graph.nodes.length}
          </Badge>
        )}
      </div>

      {/* Graph Canvas with Institution Lanes */}
      <div className="relative w-full h-[600px] border rounded-lg overflow-hidden">
        {/* Educational Bands */}
        <EducationalBands height={600} />
        
        {/* Institution Lane Backgrounds */}
        <div className="absolute inset-0 z-0">
          {CALM_LANES.map((lane) => (
            <InstitutionLane
              key={lane.id}
              id={lane.id}
              title={lane.title}
              color={lane.color}
              x={lane.x}
              width={lane.width}
              height={600}
              isOrphan={lane.id === 'jobs'} // Make jobs lane the orphan lane
            />
          ))}
        </div>
        
        <ReactFlow
          key="lifepath-safe"
          nodes={reactFlowNodes}
          edges={reactFlowEdges}
          onNodeClick={handleNodeClick}
          onNodeMouseEnter={handleNodeMouseEnter}
          onNodeMouseLeave={handleNodeMouseLeave}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.1, duration: 400 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
          <MiniMap
            nodeStrokeColor="#374151"
            nodeColor="#f3f4f6"
            nodeBorderRadius={8}
          />
          
          {/* V2: Tier Class Manager - applies tier classes after React Flow DOM updates */}
          {LP_VISUAL_V2 && (
            <TierClassManager 
              edges={graph.edges}
              reactFlowEdges={reactFlowEdges}
              activePath={activePath}
            />
          )}
        </ReactFlow>
      </div>
      
      {/* Enhanced Legend */}
      <div className="flex flex-wrap items-center gap-4 p-3 bg-muted/50 rounded-lg text-sm">
        <div className="font-medium text-muted-foreground">Node Types:</div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded border-2 border-primary bg-primary/10" />
          <span>Skills</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded border-2 border-secondary bg-secondary/10" />
          <span>Courses</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded border-2 border-accent bg-accent/10" />
          <span>Credentials</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded border-2 border-destructive bg-destructive/10" />
          <span>Jobs</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded border-2 border-orange-300 bg-orange-50" />
          <span>Exams</span>
        </div>
        
        <div className="w-px h-6 bg-border mx-2" />
        
        <div className="font-medium text-muted-foreground">Edge Types:</div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-px bg-primary" />
          <span>Required</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-px bg-secondary border-dashed" style={{ borderTopStyle: 'dashed', borderTopWidth: '2px' }} />
          <span>Alternative</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-px bg-purple-500" />
          <span>Transfer</span>
        </div>

        <div className="w-px h-6 bg-border mx-2" />
        
        <div className="font-medium text-muted-foreground">Institution Lanes:</div>
        <span className="text-xs">FCC • Global/Orphan • FSU • Credentials • Career Goals</span>
        
        <div className="w-px h-6 bg-border mx-2" />
        
        <div className="font-medium text-muted-foreground">Educational Bands:</div>
        <span className="text-xs">Foundations → Lower Division → Upper Division → Credential → Career</span>
      </div>
    </div>
  );
}

// Helper functions
function getNodePathType(nodeId: string, result?: PathfindingResult | null): string | undefined {
  if (!result) return undefined;
  
  if (result.fastest?.nodeIds.includes(nodeId)) return 'fastest';
  if (result.cheapest?.nodeIds.includes(nodeId)) return 'cheapest';
  if (result.creditMaximized?.nodeIds.includes(nodeId)) return 'credit-max';
  
  return undefined;
}

function getEdgePathType(edgeId: string, result?: PathfindingResult | null): string | undefined {
  return undefined;
}