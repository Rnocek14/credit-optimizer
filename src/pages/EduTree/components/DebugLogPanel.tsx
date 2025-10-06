/**
 * Comprehensive Debug Panel - All EduTree diagnostics in one place
 * Captures: signatures, collisions, edges, CSS changes, performance
 */

import { useState, useEffect, useRef } from 'react';
import { Copy, X, Minimize2, Maximize2, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { getDebugLogs, clearDebugLogs, type PillTrace } from '../utils/debug';
import { SIG_RE, getSigRepairCount } from '../utils/signature';
import { useToast } from '@/hooks/use-toast';

type DiagnosticSection = 'logs' | 'signatures' | 'collisions' | 'edges' | 'performance';

interface SignatureDiagnostics {
  total: number;
  invalid: number;
  leadingPipe: number;
  missingV1: number;
  doublePipe: number;
  shortDv: number;
  samples: string[];
  moduleFingerprint: string;
  repairCount: number;
}

interface CollisionInfo {
  nodeA: string;
  nodeB: string;
  areaA: number;
  areaB: number;
}

interface EdgeDiagnostics {
  total: number;
  filtered: number;
  missingHandles: number;
  invalidConnections: number;
  samples: any[];
}

interface PerformanceMetrics {
  nodeCount: number;
  edgeCount: number;
  renderTime: number;
  lastUpdate: number;
}

export function DebugLogPanel() {
  const [logs, setLogs] = useState<PillTrace[]>([]);
  const [activeSection, setActiveSection] = useState<DiagnosticSection>('logs');
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem('debugLogPanel.isOpen');
    return saved !== null ? saved === 'true' : true;
  });
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem('debugLogPanel.isMinimized');
    return saved === 'true';
  });
  
  // Diagnostic state
  const [sigDiag, setSigDiag] = useState<SignatureDiagnostics | null>(null);
  const [collisions, setCollisions] = useState<CollisionInfo[]>([]);
  const [edgeDiag, setEdgeDiag] = useState<EdgeDiagnostics | null>(null);
  const [perfMetrics, setPerfMetrics] = useState<PerformanceMetrics | null>(null);
  const [cssChanges, setCssChanges] = useState<Array<{time: number; nodeId: string; classes: string; size: string}>>([]);
  
  const { toast } = useToast();
  const observerRef = useRef<MutationObserver | null>(null);

  // Comprehensive diagnostics runner
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    
    const runDiagnostics = () => {
      // 1. Update pill logs
      setLogs(getDebugLogs());
      
      // 2. Signature diagnostics
      try {
        const rf = (window as any).__rf || (window as any).ReactFlowInstance || {};
        const nodes = rf.getNodes?.() ?? [];
        const sigs = nodes
          .map((n: any) => n?.data?.marketplace?.signature)
          .filter(Boolean);
        
        if (sigs.length > 0) {
          const leading = sigs.filter((s: string) => s.startsWith('|'));
          const missingV1 = sigs.filter((s: string) => !s.startsWith('v1|'));
          const doubles = sigs.filter((s: string) => s.includes('||'));
          const shortDv = sigs.filter((s: string) => /\|dv[a-z0-9]{0,3}\|/.test(s));
          const invalid = sigs.filter((s: string) => !SIG_RE.test(s));
          
          setSigDiag({
            total: sigs.length,
            invalid: invalid.length,
            leadingPipe: leading.length,
            missingV1: missingV1.length,
            doublePipe: doubles.length,
            shortDv: shortDv.length,
            samples: invalid.slice(0, 5),
            moduleFingerprint: (window as any).__SIG_IMPL_ID__ || 'NOT_FOUND',
            repairCount: getSigRepairCount(),
          });
        }
      } catch (err) {
        console.error('[DIAG] Signature error:', err);
      }
      
      // 3. Collision detection
      try {
        const nodeElements = Array.from(document.querySelectorAll('.react-flow__node'));
        const rects = nodeElements.map((el) => {
          const r = el.getBoundingClientRect();
          return {
            id: el.getAttribute('data-id') || (el as HTMLElement).id || '(unknown)',
            r,
          };
        });
        
        const newCollisions: CollisionInfo[] = [];
        for (let i = 0; i < rects.length; i++) {
          for (let j = i + 1; j < rects.length; j++) {
            const A = rects[i].r;
            const B = rects[j].r;
            const overlaps = !(
              A.right <= B.left ||
              A.left >= B.right ||
              A.bottom <= B.top ||
              A.top >= B.bottom
            );
            if (overlaps) {
              newCollisions.push({
                nodeA: rects[i].id,
                nodeB: rects[j].id,
                areaA: Math.round(A.width * A.height),
                areaB: Math.round(B.width * B.height),
              });
            }
          }
        }
        setCollisions(newCollisions);
      } catch (err) {
        console.error('[DIAG] Collision error:', err);
      }
      
      // 4. Edge diagnostics
      try {
        const edges = (window as any).__flowEdges__ || [];
        const filteredEdges = (window as any).__filteredEdges__ || [];
        
        const missingHandles = edges.filter((e: any) => 
          !e.sourceHandle || !e.targetHandle || 
          e.sourceHandle === 'null' || e.targetHandle === 'null' ||
          e.sourceHandle === 'undefined' || e.targetHandle === 'undefined'
        );
        
        const invalidConns = edges.filter((e: any) => 
          !e.source || !e.target
        );
        
        setEdgeDiag({
          total: edges.length,
          filtered: edges.length - filteredEdges.length,
          missingHandles: missingHandles.length,
          invalidConnections: invalidConns.length,
          samples: missingHandles.slice(0, 5),
        });
      } catch (err) {
        console.error('[DIAG] Edge error:', err);
      }
      
      // 5. Performance metrics
      try {
        const rf = (window as any).__rf || (window as any).ReactFlowInstance || {};
        const nodes = rf.getNodes?.() ?? [];
        const edges = rf.getEdges?.() ?? [];
        
        setPerfMetrics({
          nodeCount: nodes.length,
          edgeCount: edges.length,
          renderTime: performance.now(),
          lastUpdate: Date.now(),
        });
      } catch (err) {
        console.error('[DIAG] Performance error:', err);
      }
    };
    
    // Run immediately and then every second
    runDiagnostics();
    const interval = setInterval(runDiagnostics, 1000);

    return () => clearInterval(interval);
  }, []);
  
  // CSS Mutation Observer
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development' || !isOpen) return;
    
    const setupObserver = () => {
      const nodeElements = Array.from(document.querySelectorAll('.react-flow__node'));
      
      observerRef.current = new MutationObserver((mutations) => {
        mutations.forEach((m) => {
          if (m.type === 'attributes' && m.attributeName === 'class') {
            const el = m.target as HTMLElement;
            const id = el.getAttribute('data-id') || el.id || '(unknown)';
            const r = el.getBoundingClientRect();
            const classes = el.className;
            
            setCssChanges(prev => [
              ...prev.slice(-49), // Keep last 50
              {
                time: Date.now(),
                nodeId: id,
                classes,
                size: `${Math.round(r.width)}x${Math.round(r.height)}`,
              }
            ]);
          }
        });
      });
      
      nodeElements.forEach((n) => 
        observerRef.current?.observe(n, { attributes: true, attributeFilter: ['class'] })
      );
    };
    
    // Delay to let DOM render
    const timer = setTimeout(setupObserver, 500);
    
    return () => {
      clearTimeout(timer);
      observerRef.current?.disconnect();
    };
  }, [isOpen]);

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem('debugLogPanel.isOpen', String(isOpen));
  }, [isOpen]);

  useEffect(() => {
    localStorage.setItem('debugLogPanel.isMinimized', String(isMinimized));
  }, [isMinimized]);

  const copyAllDiagnostics = () => {
    const report = {
      timestamp: new Date().toISOString(),
      signatures: sigDiag,
      collisions: collisions.slice(0, 20),
      edges: edgeDiag,
      performance: perfMetrics,
      recentCssChanges: cssChanges.slice(-10),
      pillLogs: logs.slice(-20).map(log => ({
        ...log,
        mp: { ...log.mp, signature: log.mp?.signature?.slice(-20) }
      })),
    };

    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    toast({
      title: "Full Diagnostics Copied",
      description: "Complete diagnostic report copied to clipboard",
    });
  };

  const copyLog = (log: PillTrace) => {
    const shortSig = log.mp?.signature?.slice(-20);
    const formatted = JSON.stringify({
      ...log,
      mp: { ...log.mp, signature: shortSig }
    }, null, 2);

    navigator.clipboard.writeText(formatted);
    toast({
      title: "Log Copied",
      description: "Single log entry copied to clipboard",
    });
  };

  const handleClear = () => {
    clearDebugLogs();
    setLogs([]);
    setCssChanges([]);
    toast({
      title: "Diagnostics Cleared",
      description: "All debug data has been cleared",
    });
  };
  
  const getStatusIcon = (count: number, threshold: number = 0) => {
    if (count === 0) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (count > threshold) return <AlertTriangle className="w-4 h-4 text-red-500" />;
    return <Info className="w-4 h-4 text-yellow-500" />;
  };

  if (!isOpen) {
    const hasIssues = (sigDiag?.invalid || 0) > 0 || collisions.length > 0 || (edgeDiag?.filtered || 0) > 5;
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-4 right-4 z-50 bg-background border rounded-lg shadow-lg p-3 hover:bg-accent transition-colors ${
          hasIssues ? 'border-red-500 animate-pulse' : 'border-border'
        }`}
        title="Open Diagnostics Panel"
      >
        <div className="flex items-center gap-2">
          {hasIssues && <AlertTriangle className="w-4 h-4 text-red-500" />}
          <div>
            <div className="text-xs font-semibold">EduTree Diagnostics</div>
            <div className="text-[10px] text-muted-foreground">
              {hasIssues ? 'Issues detected' : 'All systems OK'}
            </div>
          </div>
        </div>
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-50 bg-background border border-border rounded-lg shadow-2xl"
      style={{ 
        width: isMinimized ? '320px' : '700px',
        maxHeight: isMinimized ? '60px' : '600px'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-muted/50">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-foreground">EduTree Diagnostics</div>
          <div className="text-xs text-muted-foreground">
            {(sigDiag?.invalid || 0) + collisions.length > 0 ? '⚠️ Issues' : '✅ OK'}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-accent rounded transition-colors"
            title={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={handleClear}
            className="p-1 hover:bg-accent rounded transition-colors text-xs px-2"
            title="Clear all diagnostics"
          >
            Clear
          </button>
          <button
            onClick={copyAllDiagnostics}
            className="p-1 hover:bg-accent rounded transition-colors"
            title="Copy full diagnostic report"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-accent rounded transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      {!isMinimized && (
        <>
          <div className="flex border-b border-border bg-muted/30">
            {(['signatures', 'collisions', 'edges', 'performance', 'logs'] as const).map((section) => {
              const issueCount = 
                section === 'signatures' ? sigDiag?.invalid || 0 :
                section === 'collisions' ? collisions.length :
                section === 'edges' ? (edgeDiag?.filtered || 0) + (edgeDiag?.missingHandles || 0) :
                0;
              
              return (
                <button
                  key={section}
                  onClick={() => setActiveSection(section)}
                  className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                    activeSection === section
                      ? 'bg-background text-foreground border-b-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    {section.charAt(0).toUpperCase() + section.slice(1)}
                    {issueCount > 0 && (
                      <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                        {issueCount}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="overflow-auto p-3" style={{ maxHeight: '490px' }}>
            {activeSection === 'signatures' && (
              <div className="space-y-3">
                <div className="text-xs font-semibold flex items-center gap-2">
                  {getStatusIcon(sigDiag?.invalid || 0)}
                  Signature Pipeline Status
                </div>
                
                {sigDiag ? (
                  <>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-muted/30 p-2 rounded">
                        <div className="text-muted-foreground">Total Signatures</div>
                        <div className="text-lg font-bold">{sigDiag.total}</div>
                      </div>
                      <div className="bg-muted/30 p-2 rounded">
                        <div className="text-muted-foreground">Invalid</div>
                        <div className={`text-lg font-bold ${sigDiag.invalid > 0 ? 'text-red-500' : 'text-green-500'}`}>
                          {sigDiag.invalid}
                        </div>
                      </div>
                      <div className="bg-muted/30 p-2 rounded">
                        <div className="text-muted-foreground">Leading Pipe</div>
                        <div className="font-semibold">{sigDiag.leadingPipe}</div>
                      </div>
                      <div className="bg-muted/30 p-2 rounded">
                        <div className="text-muted-foreground">Missing v1</div>
                        <div className="font-semibold">{sigDiag.missingV1}</div>
                      </div>
                      <div className="bg-muted/30 p-2 rounded">
                        <div className="text-muted-foreground">Double Pipe</div>
                        <div className="font-semibold">{sigDiag.doublePipe}</div>
                      </div>
                      <div className="bg-muted/30 p-2 rounded">
                        <div className="text-muted-foreground">Short DV</div>
                        <div className="font-semibold">{sigDiag.shortDv}</div>
                      </div>
                    </div>
                    
                    <div className="bg-muted/30 p-2 rounded text-xs space-y-1">
                      <div><span className="font-semibold">Module ID:</span> <code className="text-[10px]">{sigDiag.moduleFingerprint}</code></div>
                      <div><span className="font-semibold">Auto-repairs:</span> {sigDiag.repairCount}</div>
                    </div>
                    
                    {sigDiag.samples.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-red-500 mb-1">Invalid Signature Samples:</div>
                        {sigDiag.samples.map((sig, i) => (
                          <div key={i} className="text-[10px] font-mono bg-red-500/10 p-2 rounded mb-1 break-all">
                            {sig}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">Loading signature diagnostics...</div>
                )}
              </div>
            )}

            {activeSection === 'collisions' && (
              <div className="space-y-3">
                <div className="text-xs font-semibold flex items-center gap-2">
                  {getStatusIcon(collisions.length, 2)}
                  Node Layout Collisions
                </div>
                
                {collisions.length === 0 ? (
                  <div className="text-sm text-green-600 bg-green-500/10 p-3 rounded">
                    ✅ No node overlaps detected
                  </div>
                ) : (
                  <>
                    <div className="bg-red-500/10 p-2 rounded text-xs">
                      <div className="font-bold text-red-500">⚠️ {collisions.length} collision(s) detected</div>
                      <div className="text-muted-foreground">Nodes are overlapping - may cause visual issues</div>
                    </div>
                    
                    <div className="space-y-1">
                      {collisions.slice(0, 15).map((col, i) => (
                        <div key={i} className="text-xs font-mono bg-muted/30 p-2 rounded">
                          <div className="font-semibold text-red-500">{col.nodeA} ↔ {col.nodeB}</div>
                          <div className="text-[10px] text-muted-foreground">
                            Areas: {col.areaA}px² ↔ {col.areaB}px²
                          </div>
                        </div>
                      ))}
                      {collisions.length > 15 && (
                        <div className="text-xs text-muted-foreground text-center">
                          ... and {collisions.length - 15} more
                        </div>
                      )}
                    </div>
                  </>
                )}
                
                <div className="text-[10px] text-muted-foreground bg-muted/30 p-2 rounded">
                  💡 <strong>Tip:</strong> Collisions often occur when CSS classes change node size. Check CSS changes tab and ensure overlay styles use outline/box-shadow (non-sizing) instead of border/padding.
                </div>
              </div>
            )}

            {activeSection === 'edges' && (
              <div className="space-y-3">
                <div className="text-xs font-semibold flex items-center gap-2">
                  {getStatusIcon((edgeDiag?.filtered || 0) + (edgeDiag?.missingHandles || 0), 5)}
                  Edge Connection Status
                </div>
                
                {edgeDiag ? (
                  <>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-muted/30 p-2 rounded">
                        <div className="text-muted-foreground">Total Edges</div>
                        <div className="text-lg font-bold">{edgeDiag.total}</div>
                      </div>
                      <div className="bg-muted/30 p-2 rounded">
                        <div className="text-muted-foreground">Filtered Out</div>
                        <div className={`text-lg font-bold ${edgeDiag.filtered > 5 ? 'text-red-500' : 'text-green-500'}`}>
                          {edgeDiag.filtered}
                        </div>
                      </div>
                      <div className="bg-muted/30 p-2 rounded">
                        <div className="text-muted-foreground">Missing Handles</div>
                        <div className={`font-semibold ${edgeDiag.missingHandles > 0 ? 'text-red-500' : 'text-green-500'}`}>
                          {edgeDiag.missingHandles}
                        </div>
                      </div>
                      <div className="bg-muted/30 p-2 rounded">
                        <div className="text-muted-foreground">Invalid Connections</div>
                        <div className={`font-semibold ${edgeDiag.invalidConnections > 0 ? 'text-red-500' : 'text-green-500'}`}>
                          {edgeDiag.invalidConnections}
                        </div>
                      </div>
                    </div>
                    
                    {edgeDiag.samples.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-red-500 mb-1">Problem Edges:</div>
                        {edgeDiag.samples.map((edge, i) => (
                          <div key={i} className="text-[10px] font-mono bg-red-500/10 p-2 rounded mb-1">
                            <div><strong>ID:</strong> {edge.id}</div>
                            <div><strong>Source:</strong> {edge.source} → {edge.sourceHandle || '❌ MISSING'}</div>
                            <div><strong>Target:</strong> {edge.target} → {edge.targetHandle || '❌ MISSING'}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">Loading edge diagnostics...</div>
                )}
              </div>
            )}

            {activeSection === 'performance' && (
              <div className="space-y-3">
                <div className="text-xs font-semibold">Performance Metrics</div>
                
                {perfMetrics ? (
                  <>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-muted/30 p-2 rounded">
                        <div className="text-muted-foreground">Nodes Rendered</div>
                        <div className="text-lg font-bold">{perfMetrics.nodeCount}</div>
                      </div>
                      <div className="bg-muted/30 p-2 rounded">
                        <div className="text-muted-foreground">Edges Rendered</div>
                        <div className="text-lg font-bold">{perfMetrics.edgeCount}</div>
                      </div>
                      <div className="bg-muted/30 p-2 rounded col-span-2">
                        <div className="text-muted-foreground">Last Update</div>
                        <div className="text-xs font-mono">{new Date(perfMetrics.lastUpdate).toLocaleTimeString()}</div>
                      </div>
                    </div>
                    
                    {cssChanges.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold mb-1">Recent CSS Changes (Live Monitor)</div>
                        <div className="space-y-1 max-h-60 overflow-auto">
                          {cssChanges.slice(-10).reverse().map((change, i) => (
                            <div key={i} className="text-[10px] font-mono bg-muted/30 p-2 rounded">
                              <div><strong>Node:</strong> {change.nodeId}</div>
                              <div><strong>Size:</strong> {change.size}</div>
                              <div className="text-[9px] text-muted-foreground truncate">
                                {change.classes}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">Loading performance metrics...</div>
                )}
              </div>
            )}

            {activeSection === 'logs' && (
              <div className="space-y-2">
                {logs.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    No pill trace logs yet. Logs will appear as nodes render.
                  </div>
                ) : (
                  logs.slice(-30).reverse().map((log, i) => (
                    <div 
                      key={i}
                      className="text-xs font-mono bg-muted/30 p-2 rounded border border-border/50 hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 overflow-auto">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-semibold ${
                              log.stage === 'MP_BATCH' ? 'text-blue-500' :
                              log.stage === 'KEY_RESOLUTION' ? 'text-purple-500' :
                              log.stage === 'ENRICH_BLOCK' ? 'text-green-500' :
                              log.stage === 'SET_NODES' ? 'text-orange-500' :
                              log.stage === 'RF_RENDER' ? 'text-cyan-500' :
                              'text-pink-500'
                            }`}>
                              {log.stage}
                            </span>
                            {log.blockId && (
                              <span className="text-muted-foreground">{log.blockId}</span>
                            )}
                            {log.note && (
                              <span className={`text-xs ${
                                log.note === 'MISS' ? 'text-red-500 font-bold' :
                                log.note === 'hit' ? 'text-green-500' :
                                'text-muted-foreground'
                              }`}>
                                {log.note}
                              </span>
                            )}
                          </div>
                          {log.mp && (
                            <div className="text-muted-foreground ml-2">
                              count: {log.mp.count ?? 'undefined'} | 
                              len: {log.mp.optionsLen ?? 0} | 
                              show: {String(log.mp.show)} | 
                              sig: {log.mp.signature?.slice(-15) ?? 'none'}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => copyLog(log)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-accent rounded transition-all"
                          title="Copy this log"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
