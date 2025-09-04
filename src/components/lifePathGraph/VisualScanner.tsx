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
  const [scanRunning, setScanRunning] = useState(false);
  const [scanReport, setScanReport] = useState<VisualScanSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runVisualScanNow = async () => {
    setScanRunning(true);
    setError(null);
    
    try {
      const report = runVisualScan({
        graph,
        pathfindingResult,
        activePreset,
      });
      setScanReport(report);
      markIssues(report);
      console.info('[visual-scan]', report);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('[visual-scan] error:', err);
    } finally {
      setScanRunning(false);
    }
  };

  // Mark visual issues on the DOM for debugging
  const markIssues = (report: VisualScanSnapshot | null) => {
    if (!report) return;
    
    try {
      // Clean up previous marks
      document.querySelectorAll('[data-lp-mark]').forEach(n => n.remove());
      
      const addBox = (r: DOMRect, color: string) => {
        const div = document.createElement('div');
        div.setAttribute('data-lp-mark', '1');
        Object.assign(div.style, {
          position: 'fixed', 
          left: `${r.left}px`, 
          top: `${r.top}px`,
          width: `${r.width}px`, 
          height: `${r.height}px`,
          border: `2px solid ${color}`, 
          borderRadius: '8px', 
          pointerEvents: 'none', 
          zIndex: '9999'
        });
        document.body.appendChild(div);
      };

      // Highlight nodes involved in issues
      report.issues.forEach(issue => {
        if (issue.type === 'NODE_OVERLAP' || issue.type === 'EDGE_THROUGH_NODE') {
          const nodeId = (issue as any).nodeId || (issue as any).aId;
          const el = document.querySelector(
            `.react-flow__node[data-id="${nodeId}"]`
          ) as HTMLElement | null;
          
          if (el) {
            const color = issue.type === 'NODE_OVERLAP' ? '#ef4444' : '#f59e0b';
            addBox(el.getBoundingClientRect(), color);
          }
        }
      });
    } catch (err) {
      console.warn('[visual-scan] Failed to mark issues:', err);
    }
  };

  return (
    <div className="mt-3 p-3 rounded-lg border border-muted bg-background/50 backdrop-blur-sm">
      <div className="text-sm font-medium mb-2 flex items-center justify-between">
        <span>Visual Scanner</span>
        <div className="text-xs text-muted-foreground">Development Tool</div>
      </div>
      
      <div className="flex items-center gap-2 mb-3">
        <Button
          size="sm"
          onClick={runVisualScanNow}
          disabled={scanRunning}
          className="bg-primary text-primary-foreground"
        >
          {scanRunning ? 'Scanning…' : 'Run Visual Scan'}
        </Button>
        
        {scanReport && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markIssues(scanReport)}
            className="text-xs"
          >
            Highlight Issues
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-2 p-2 rounded text-xs bg-destructive/10 text-destructive border border-destructive/20">
          <strong>Error:</strong> {error}
        </div>
      )}

      {scanReport && (
        <div className="text-xs">
          <div className="mb-2 p-2 rounded bg-muted/50">
            <div className="font-medium mb-1">Summary</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>Nodes: {scanReport.counts.nodes}</div>
              <div>Edges: {scanReport.counts.edges}</div>
              <div>Labels: {scanReport.counts.labels}</div>
              <div>Issues: {scanReport.issues.length}</div>
            </div>
          </div>
          
          {scanReport.issues.length > 0 && (
            <div className="mb-2 p-2 rounded bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <div className="font-medium mb-1 text-amber-800 dark:text-amber-200">
                Issues Found ({scanReport.issues.length})
              </div>
              {scanReport.issues.slice(0, 3).map((issue, idx) => (
                <div key={idx} className="text-amber-700 dark:text-amber-300">
                  • {issue.type}: {(issue as any).message || 'No details'}
                </div>
              ))}
              {scanReport.issues.length > 3 && (
                <div className="text-amber-600 dark:text-amber-400">
                  ... and {scanReport.issues.length - 3} more
                </div>
              )}
            </div>
          )}

          <details className="mt-2">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Full Report (JSON)
            </summary>
            <pre className="mt-2 p-2 rounded bg-muted text-xs overflow-auto max-h-64 whitespace-pre-wrap">
              {JSON.stringify(scanReport, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}