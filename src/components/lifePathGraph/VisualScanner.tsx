import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LifePathGraph } from '@/hooks/useLifePathGraph';
import { PathfindingResult } from '@/types/lifePathGraph';
import { Edge } from '@xyflow/react';
import { layoutAndScan, type Graph as LayoutGraph } from '@/lib/layout/unifiedLayoutV3';

interface VisualScannerProps {
  graph: LifePathGraph;
  pathfindingResult?: PathfindingResult | null;
  activePreset: 'fastest' | 'cheapest' | 'creditMaximized' | 'balanced';
  reactFlowEdges: any[];
}

interface VisualScanReport {
  counts: {
    nodes: number;
    edges: number;
    labels: number;
  };
  tiers: {
    edgeOn: number;
    edgeRelated: number;
    edgeOff: number;
  };
  issues: Array<{
    type: 'NODE_OVERLAP' | 'EDGE_CROSSING' | 'EDGE_THROUGH_NODE';
    aId?: string;
    bId?: string;
    edgeId?: string;
    nodeId?: string;
  }>;
}

export function VisualScanner({ graph, pathfindingResult, activePreset, reactFlowEdges }: VisualScannerProps) {
  const [scanRunning, setScanRunning] = useState(false);
  const [scanReport, setScanReport] = useState<VisualScanReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runVisualScanNow = async () => {
    setScanRunning(true);
    setError(null);
    try {
      console.log('🔍 Running visual scan...');
      
      // Use the reactFlowEdges passed from the canvas if available
      if (reactFlowEdges && reactFlowEdges.length > 0) {
        const tierCounts = reactFlowEdges.reduce((acc, e) => {
          const tier = e.data?.tier;
          if (tier === 'on-path') acc.edgeOn++;
          else if (tier === 'related') acc.edgeRelated++;
          else if (tier === 'off-path') acc.edgeOff++;
          return acc;
        }, { edgeOn: 0, edgeRelated: 0, edgeOff: 0 });
        
        // Simple report from React Flow data
        const report: VisualScanReport = {
          counts: {
            nodes: graph.nodes?.length || 0,
            edges: reactFlowEdges.length,
            labels: reactFlowEdges.filter(e => e.data?.edgeLabel).length,
          },
          tiers: tierCounts,
          issues: [], // No layout issues when using React Flow data directly
        };
        
        setScanReport(report);
        return;
      }

      // Fallback: Map to layout format for scanning
      const graphV3: LayoutGraph = {
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
          kind: 'related',
          data: e,
        })),
      };

      // Use the new layout + scan system
      const { scan } = layoutAndScan(
        graphV3,
        { hGap: 320, vGap: 28, laneOrder: ['Core', 'Electives', 'Transfer', 'Orphan'] },
        []
      );
      
      // Convert scan results to expected format
      const report: VisualScanReport = {
        counts: {
          nodes: graphV3.nodes.length,
          edges: graphV3.edges.length,
          labels: reactFlowEdges?.filter(e => e.data?.edgeLabel).length || 0,
        },
        tiers: {
          edgeOn: reactFlowEdges?.filter(e => e.data?.tier === 'on-path').length || 0,
          edgeRelated: reactFlowEdges?.filter(e => e.data?.tier === 'related').length || 0,
          edgeOff: reactFlowEdges?.filter(e => e.data?.tier === 'off-path').length || 0,
        },
        issues: [
          ...scan.nodeOverlaps.map(({a, b}) => ({ type: 'NODE_OVERLAP' as const, aId: a, bId: b })),
          ...scan.edgeCrossings.map(({a, b}) => ({ type: 'EDGE_CROSSING' as const, aId: a, bId: b })),
          ...scan.throughNodes.map(({edge, node}) => ({ type: 'EDGE_THROUGH_NODE' as const, edgeId: edge, nodeId: node })),
        ],
      };
      
      setScanReport(report);
      
      if (import.meta.env.DEV) {
        console.log('[SCAN SUMMARY]', scan.summary, scan);
      }
      
    } catch (err) {
      console.error('Visual scan failed:', err);
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setScanRunning(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-background">
      <div className="flex items-center gap-2 mb-4">
        <Button
          onClick={runVisualScanNow}
          disabled={scanRunning}
          variant="outline"
          size="sm"
        >
          {scanRunning ? 'Scanning…' : 'Run Visual Scan'}
        </Button>
      </div>

      {error && (
        <div className="text-red-600 bg-red-50 p-2 rounded mb-4">
          Error: {error}
        </div>
      )}

      {scanReport && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="font-medium">Nodes</div>
              <div>{scanReport.counts.nodes}</div>
            </div>
            <div>
              <div className="font-medium">Edges</div>
              <div>{scanReport.counts.edges}</div>
            </div>
            <div>
              <div className="font-medium">Labels</div>
              <div>{scanReport.counts.labels}</div>
            </div>
          </div>

          {scanReport.tiers && (
            <div className="border rounded p-3">
              <div className="font-medium mb-2">V2 Tiers</div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>On: {scanReport.tiers.edgeOn}</div>
                <div>Related: {scanReport.tiers.edgeRelated}</div>
                <div>Off: {scanReport.tiers.edgeOff}</div>
              </div>
            </div>
          )}

          <div className="border rounded p-3">
            <div className="font-medium mb-2">Issues ({scanReport.issues.length})</div>
            {scanReport.issues.length === 0 ? (
              <div className="text-green-600">No issues found!</div>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Overlaps: {scanReport.issues.filter(i => i.type === 'NODE_OVERLAP').length}</div>
                <div>Crossings: {scanReport.issues.filter(i => i.type === 'EDGE_CROSSING').length}</div>
                <div>Through Nodes: {scanReport.issues.filter(i => i.type === 'EDGE_THROUGH_NODE').length}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}