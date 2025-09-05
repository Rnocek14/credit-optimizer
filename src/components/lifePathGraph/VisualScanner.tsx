import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { runVisualScan, VisualScanSnapshot } from '@/dev/visualScan';
import { LifePathGraph } from '@/hooks/useLifePathGraph';
import { PathfindingResult } from '@/types/lifePathGraph';

interface VisualScannerProps {
  graph: LifePathGraph;
  pathfindingResult?: PathfindingResult | null;
  activePreset: 'fastest' | 'cheapest' | 'creditMaximized' | 'balanced';
}

export function VisualScanner({ graph, pathfindingResult, activePreset }: VisualScannerProps) {
  // Always visible for debugging - DEV check removed
  const [scanRunning, setScanRunning] = useState(false);
  const [scanReport, setScanReport] = useState<VisualScanSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runVisualScanNow = async () => {
    if (scanRunning) return;
    setScanRunning(true);
    setError(null);
    
    try {
      const report = await runVisualScan({
        graph,
        pathfindingResult,
        activePreset,
      });
      setScanReport(report);
      markIssues(report);
      
      // Log acceptance gate status
      const totalTiers = (report.tiers?.edgeOn || 0) + (report.tiers?.edgeRelated || 0) + (report.tiers?.edgeOff || 0);
      const throughNodes = report.issues.filter(i => i.type === 'EDGE_THROUGH_NODE').length;
      const overlaps = report.issues.filter(i => i.type === 'NODE_OVERLAP').length;
      const crossings = report.issues.filter(i => i.type === 'EDGE_CROSSING').length;
      const missingLabels = report.issues.filter(i => i.type === 'MISSING_LABEL').length;
      
      console.info('[visual-scan] Acceptance Gates:', {
        tiersDetected: totalTiers > 0 ? '✅' : '❌',
        noThroughNodes: throughNodes <= 1 ? '✅' : '❌',
        lowOverlaps: overlaps <= 2 ? '✅' : '❌', 
        lowCrossings: crossings <= 2 ? '✅' : '❌',
        hasLabels: report.counts.labels > 0 && missingLabels === 0 ? '✅' : '❌'
      });
      
      console.info('[visual-scan]', report);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Visual scan failed:', errorMessage);
    } finally {
      setScanRunning(false);
    }
  };

  const markIssues = (report: VisualScanSnapshot | null) => {
    if (!report) return;
    
    // Clear previous markings
    document.querySelectorAll('.visual-scan-highlight').forEach(el => {
      el.classList.remove('visual-scan-highlight');
      (el as HTMLElement).style.border = '';
    });

    // Mark nodes with overlaps or edge-through-node issues
    report.issues.forEach(issue => {
      if (issue.type === 'NODE_OVERLAP') {
        const nodeA = document.querySelector(`[data-testid="lp-node"][data-id="${issue.aId}"]`);
        const nodeB = document.querySelector(`[data-testid="lp-node"][data-id="${issue.bId}"]`);
        if (nodeA) {
          nodeA.classList.add('visual-scan-highlight');
          (nodeA as HTMLElement).style.border = '2px solid red';
        }
        if (nodeB) {
          nodeB.classList.add('visual-scan-highlight');
          (nodeB as HTMLElement).style.border = '2px solid red';
        }
      } else if (issue.type === 'EDGE_THROUGH_NODE') {
        const node = document.querySelector(`[data-testid="lp-node"][data-id="${issue.nodeId}"]`);
        if (node) {
          node.classList.add('visual-scan-highlight');
          (node as HTMLElement).style.border = '2px solid orange';
        }
      }
    });
  };

  const overlaps = scanReport?.issues?.filter(i => i.type === 'NODE_OVERLAP')?.length || 0;
  const crossings = scanReport?.issues?.filter(i => i.type === 'EDGE_CROSSING')?.length || 0;
  const throughNodes = scanReport?.issues?.filter(i => i.type === 'EDGE_THROUGH_NODE')?.length || 0;
  const missingLabels = scanReport?.issues?.filter(i => i.type === 'MISSING_LABEL')?.length || 0;

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
        {scanReport && (
          <Button
            onClick={() => markIssues(scanReport)}
            variant="ghost"
            size="sm"
          >
            Highlight Issues
          </Button>
        )}
      </div>

      {error && (
        <div className="text-red-600 bg-red-50 p-2 rounded mb-4">
          Error: {error}
        </div>
      )}

      {scanReport && (
        <div className="space-y-4">
          {/* Summary */}
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

          {/* V2 Tiers */}
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

          {/* Issues Summary */}
          <div className="border rounded p-3">
            <div className="font-medium mb-2">Issues ({scanReport.issues.length})</div>
            {scanReport.issues.length === 0 ? (
              <div className="text-green-600">No issues found!</div>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Overlaps: {overlaps}</div>
                <div>Crossings: {crossings}</div>
                <div>Through Nodes: {throughNodes}</div>
                <div>Missing Labels: {missingLabels}</div>
              </div>
            )}
          </div>

          {/* First few issues */}
          {scanReport.issues.length > 0 && (
            <div className="border rounded p-3">
              <div className="font-medium mb-2">Issue Details</div>
              <div className="space-y-1 text-sm">
                {scanReport.issues.slice(0, 5).map((issue, i) => (
                  <div key={i} className="font-mono text-xs">
                    {issue.type}: {JSON.stringify(issue).slice(0, 80)}...
                  </div>
                ))}
                {scanReport.issues.length > 5 && (
                  <div className="text-muted-foreground">
                    ...and {scanReport.issues.length - 5} more
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Full JSON (collapsible) */}
          <details className="border rounded p-3">
            <summary className="font-medium cursor-pointer">Full Report JSON</summary>
            <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-auto">
              {JSON.stringify(scanReport, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}