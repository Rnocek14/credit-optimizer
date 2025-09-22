import * as React from 'react';
import { usePathHighlight } from '../ctx/PathHighlightContext';

type NodeLike = { id: string; type?: string; hidden?: boolean; data?: any; style?: any };
type EdgeLike = { id: string; source: string; target: string; type?: string; sourceHandle?: any; targetHandle?: any };

function keyFromHeaderId(id: string): `${'program'|'track'}:${string}` | null {
  if (id.startsWith('program-header:')) return `program:${id.split(':')[1]}` as any;
  if (id.startsWith('track-header:'))   return `track:${id.split(':')[1]}` as any;
  return null;
}

function getNodes(): NodeLike[] {
  // Read the actual rendered arrays that ReactFlow is displaying
  return (window as any).__dimmedNodes__ ?? (window as any).__flowNodes__ ?? [];
}

function getEdges(): EdgeLike[] {
  // Read the actual rendered arrays that ReactFlow is displaying  
  return (window as any).__safeEdges__ ?? (window as any).__flowEdges__ ?? [];
}

function countDimmed(nodes = getNodes(), edges = getEdges()) {
  const nodesDim = nodes.filter(n => !n.hidden && (n.data?.__dim === 1 || (n.style?.opacity ?? 1) < 1)).length;
  const edgesDim = edges.filter(e => (e as any).data?.__dim === 1 || ((e as any).style?.opacity ?? 1) < 1).length;
  return { nodes: nodesDim, edges: edgesDim };
}

export default function HighlightDiagnostics() {
  if (process.env.NODE_ENV !== 'development') return null;
  
  // Position the debug menu in a visible location
  const ctx = (() => { try { return usePathHighlight(); } catch { return null; } })();
  const [result, setResult] = React.useState<string>('Idle');
  const [details, setDetails] = React.useState<any>(null);
  const [debugInfo, setDebugInfo] = React.useState<string>('');
  
  // Live context state (updates in real-time)
  const probe = (window as any).__highlight_state__ || null;

  const run = React.useCallback(() => {
    if (!ctx) {
      setResult('FAIL');
      setDetails({ error: 'No context available' });
      return;
    }

    setResult('Testing...');
    
    try {
      const nodes = getNodes();
      const edges = getEdges();
      const headers = nodes.filter(n => n.id?.startsWith?.('program-header:') || n.id?.startsWith?.('track-header:'));
      
      // Choose a deterministic header (SE preferred)
      const seHeader = headers.find(h => h.id === 'track-header:se');
      const dsHeader = headers.find(h => h.id === 'track-header:ds');
      const headerKey = seHeader ? 'track:se' : dsHeader ? 'track:ds' : null;

      const badHandles = edges.filter(e =>
        e.sourceHandle === null || e.sourceHandle === 'null' || e.targetHandle === 'null'
      );

      const ids = new Set(nodes.filter(n => !n.hidden).map(n => n.id));
      const dangling = edges.filter(e => !ids.has(e.source) || !ids.has(e.target));

      // --- Normalize state: unlock anything + clear hover ---
      if (ctx.lockedKey) {
        ctx.toggleLock(ctx.lockedKey as any);
      }
      ctx.clearPreview();

      // Wait for React state to update and DOM to re-render
      setTimeout(() => {
        const nodes0 = getNodes();
        const edges0 = getEdges();
        const before = countDimmed(nodes0, edges0);

        const details: any = {
          headers: headers.length,
          badHandles: badHandles.length,
          dangling: dangling.length,
          before
        };

        // If no headers, partial pass/fail
        if (!headerKey) {
          const pass = badHandles.length === 0 && dangling.length === 0 && headers.length > 0;
          setResult(pass ? 'PASS (partial)' : 'FAIL (partial)');
          setDetails({ ...details, note: 'No headers found' });
          setDebugInfo(`No testable headers. Found: ${headers.map(h => h.id).join(', ')}`);
          return;
        }

        // Step 1: hover preview
        ctx.preview(headerKey);
        setTimeout(() => {
          const nodesH = getNodes();
          const edgesH = getEdges();
          const afterHover = countDimmed(nodesH, edgesH);
          details.afterHover = afterHover;

          // Step 2: lock 
          ctx.toggleLock(headerKey);
          setTimeout(() => {
            const nodesL = getNodes();
            const edgesL = getEdges();
            const afterLock = countDimmed(nodesL, edgesL);
            details.afterLock = afterLock;

            // Step 3: clear hover (lock should persist)
            ctx.clearPreview();
            setTimeout(() => {
              const nodesA = getNodes();
              const edgesA = getEdges();
              const afterLeave = countDimmed(nodesA, edgesA);
              details.afterLeave = afterLeave;

              // Test criteria
              const hasHeaders = headers.length > 0;
              const noBadHandles = badHandles.length === 0;
              const noDanglingEdges = dangling.length === 0;
              const dimmingWorks = afterHover.nodes > before.nodes || afterHover.edges > before.edges;
              const lockPersists = afterLeave.nodes >= afterHover.nodes && afterLeave.edges >= afterHover.edges;

              const pass = hasHeaders && noBadHandles && noDanglingEdges && dimmingWorks && lockPersists;

              setResult(pass ? 'PASS' : 'FAIL');
              setDetails(details);
              // Analyze membership distribution for requirement nodes
              const requirementNodes = nodes0.filter(n => n.type === 'requirement');
              const membership = requirementNodes.reduce((acc: any, n: any) => {
                const d = n.data || {};
                const pid = d.program_id ?? (d.block?.program_id ?? null);
                const tid = d.track_id ?? (d.block?.track_id ?? null);
                acc.programs[pid ?? 'shared'] = (acc.programs[pid ?? 'shared'] || 0) + 1;
                acc.tracks[tid ?? 'shared'] = (acc.tracks[tid ?? 'shared'] || 0) + 1;
                return acc;
              }, { programs: {} as Record<string, number>, tracks: {} as Record<string, number> });

              // Find sample nodes of each type
              const sampleSE = requirementNodes.find(n => n.data?.track_id === 'se' || n.data?.block?.track_id === 'se');
              const sampleDS = requirementNodes.find(n => n.data?.track_id === 'ds' || n.data?.block?.track_id === 'ds');
              const sampleShared = requirementNodes.find(n => !n.data?.track_id && !n.data?.block?.track_id);

              const debugText = [
                `Headers found: ${headers.map(h => h.id).join(', ')}`,
                `Active key: ${ctx?.activeKey || 'none'}`,
                `Hovered key: ${ctx?.hoveredKey || 'none'}`, 
                `Locked key: ${ctx?.lockedKey || 'none'}`,
                `---MEMBERSHIP ANALYSIS---`,
                `Total requirement nodes: ${requirementNodes.length}`,
                `Program distribution: ${JSON.stringify(membership.programs)}`,
                `Track distribution: ${JSON.stringify(membership.tracks)}`,
                `---SAMPLE NODES---`,
                `SE node sample: ${sampleSE ? `${sampleSE.id} - track_id: ${sampleSE.data?.track_id || 'null'}` : 'none found'}`,
                `DS node sample: ${sampleDS ? `${sampleDS.id} - track_id: ${sampleDS.data?.track_id || 'null'}` : 'none found'}`,
                `Shared node sample: ${sampleShared ? `${sampleShared.id} - track_id: ${sampleShared.data?.track_id || 'null'}` : 'none found'}`,
                `---DEBUG INFO---`,
                `Sample node data: ${nodes0[0]?.data ? JSON.stringify(nodes0[0].data, null, 2) : 'none'}`,
                `Node types: ${[...new Set(nodes0.map(n => n.type))].join(', ')}`,
                `Edge types: ${[...new Set(edges0.map(e => e.type))].join(', ')}`,
                `Dimming test: before=${before.nodes}/${before.edges}, hover=${afterHover.nodes}/${afterHover.edges}, works=${dimmingWorks}`
              ].join('\n');
              setDebugInfo(debugText);
              
            }, 80); // after clear preview
          }, 80); // after lock
        }, 80); // after hover
      }, 80); // after normalize
      
    } catch (error) {
      setResult('ERROR');
      setDetails({ error: String(error) });
      setDebugInfo(String(error));
    }
  }, [ctx]);

  const resetState = React.useCallback(() => {
    if (!ctx) return;
    if (ctx.lockedKey) {
      ctx.toggleLock(ctx.lockedKey as any);
    }
    ctx.clearPreview();
  }, [ctx]);

  return (
    <div
      style={{
        position: 'fixed', bottom: 16, left: 16, zIndex: 3000,
        background: 'rgba(20,25,35,0.95)', color: '#fff',
        border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: 10,
        fontSize: 11, lineHeight: 1.3, maxWidth: 320, pointerEvents: 'auto',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
      }}
      aria-live="polite"
    >
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Highlight Diagnostics</div>

      <button
        onClick={run}
        style={{
          cursor: 'pointer', padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)',
          background: 'rgba(255,255,255,0.08)', color: '#fff', marginBottom: 8, width: '100%'
        }}
      >
        Run smoke test
      </button>

      <button
        onClick={resetState}
        style={{
          cursor: 'pointer', padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)',
          background: 'rgba(255,0,0,0.1)', color: '#fff', marginBottom: 8, width: '100%',
          fontSize: 10
        }}
      >
        Reset State
      </button>

      {/* Context Debug Controls */}
      <div style={{ marginBottom: 8, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 4, opacity: 0.7 }}>Context Debug</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <button
            disabled={!ctx}
            onClick={() => ctx?.preview('track:se')}
            style={{
              cursor: ctx ? 'pointer' : 'not-allowed', padding: '3px 6px', borderRadius: 4, 
              border: '1px solid rgba(255,255,255,0.2)', background: ctx ? 'rgba(0,255,0,0.1)' : 'rgba(255,255,255,0.05)', 
              color: ctx ? '#fff' : '#888', fontSize: 9
            }}
          >
            SE
          </button>
          <button
            disabled={!ctx}
            onClick={() => ctx?.preview('track:ds')}
            style={{
              cursor: ctx ? 'pointer' : 'not-allowed', padding: '3px 6px', borderRadius: 4, 
              border: '1px solid rgba(255,255,255,0.2)', background: ctx ? 'rgba(0,0,255,0.1)' : 'rgba(255,255,255,0.05)', 
              color: ctx ? '#fff' : '#888', fontSize: 9
            }}
          >
            DS
          </button>
          <button
            disabled={!ctx}
            onClick={() => ctx?.preview('program:bs_cs')}
            style={{
              cursor: ctx ? 'pointer' : 'not-allowed', padding: '3px 6px', borderRadius: 4, 
              border: '1px solid rgba(255,255,255,0.2)', background: ctx ? 'rgba(128,128,0,0.1)' : 'rgba(255,255,255,0.05)', 
              color: ctx ? '#fff' : '#888', fontSize: 9
            }}
          >
            CS Program
          </button>
          <button
            disabled={!ctx}
            onClick={() => ctx?.preview('program:bs_it')}
            style={{
              cursor: ctx ? 'pointer' : 'not-allowed', padding: '3px 6px', borderRadius: 4, 
              border: '1px solid rgba(255,255,255,0.2)', background: ctx ? 'rgba(128,64,128,0.1)' : 'rgba(255,255,255,0.05)', 
              color: ctx ? '#fff' : '#888', fontSize: 9
            }}
          >
            IT Program
          </button>
          <button
            disabled={!ctx}
            onClick={() => ctx?.preview('program:bsn')}
            style={{
              cursor: ctx ? 'pointer' : 'not-allowed', padding: '3px 6px', borderRadius: 4, 
              border: '1px solid rgba(255,255,255,0.2)', background: ctx ? 'rgba(255,128,128,0.1)' : 'rgba(255,255,255,0.05)', 
              color: ctx ? '#fff' : '#888', fontSize: 9
            }}
          >
            BSN
          </button>
          <button
            disabled={!ctx}
            onClick={() => ctx?.clearPreview()}
            style={{
              cursor: ctx ? 'pointer' : 'not-allowed', padding: '3px 6px', borderRadius: 4, 
              border: '1px solid rgba(255,255,255,0.2)', background: ctx ? 'rgba(255,0,0,0.1)' : 'rgba(255,255,255,0.05)', 
              color: ctx ? '#fff' : '#888', fontSize: 9
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Dual Selection Controls */}
      <div style={{ marginBottom: 8, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 4, opacity: 0.7 }}>Compare-Any (Dual Selection)</div>
        <div style={{ marginBottom: 4, fontSize: 9, opacity: 0.8 }}>
          Primary: {ctx?.primarySelection ? `${ctx.primarySelection.kind}:${ctx.primarySelection.id}` : 'none'}
        </div>
        <div style={{ marginBottom: 4, fontSize: 9, opacity: 0.8 }}>
          Secondary: {ctx?.secondarySelection ? `${ctx.secondarySelection.kind}:${ctx.secondarySelection.id}` : 'none'}
        </div>
        <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', marginBottom: 4 }}>
          <button
            disabled={!ctx}
            onClick={() => ctx?.setPrimarySelection({ kind: 'track', id: 'se' })}
            style={{
              cursor: ctx ? 'pointer' : 'not-allowed', padding: '2px 4px', borderRadius: 3, 
              border: '1px solid rgba(255,255,255,0.2)', 
              background: ctx?.primarySelection?.kind === 'track' && ctx?.primarySelection?.id === 'se' ? 'rgba(0,255,0,0.2)' : 'rgba(0,255,0,0.05)', 
              color: ctx ? '#fff' : '#888', fontSize: 8
            }}
          >
            P:SE
          </button>
          <button
            disabled={!ctx}
            onClick={() => ctx?.setPrimarySelection({ kind: 'track', id: 'ds' })}
            style={{
              cursor: ctx ? 'pointer' : 'not-allowed', padding: '2px 4px', borderRadius: 3, 
              border: '1px solid rgba(255,255,255,0.2)', 
              background: ctx?.primarySelection?.kind === 'track' && ctx?.primarySelection?.id === 'ds' ? 'rgba(0,255,0,0.2)' : 'rgba(0,255,0,0.05)', 
              color: ctx ? '#fff' : '#888', fontSize: 8
            }}
          >
            P:DS
          </button>
          <button
            disabled={!ctx}
            onClick={() => ctx?.setPrimarySelection({ kind: 'program', id: 'bsn' })}
            style={{
              cursor: ctx ? 'pointer' : 'not-allowed', padding: '2px 4px', borderRadius: 3, 
              border: '1px solid rgba(255,255,255,0.2)', 
              background: ctx?.primarySelection?.kind === 'program' && ctx?.primarySelection?.id === 'bsn' ? 'rgba(0,255,0,0.2)' : 'rgba(0,255,0,0.05)', 
              color: ctx ? '#fff' : '#888', fontSize: 8
            }}
          >
            P:BSN
          </button>
        </div>
        <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', marginBottom: 4 }}>
          <button
            disabled={!ctx}
            onClick={() => ctx?.setSecondarySelection({ kind: 'track', id: 'ds' })}
            style={{
              cursor: ctx ? 'pointer' : 'not-allowed', padding: '2px 4px', borderRadius: 3, 
              border: '1px solid rgba(255,255,255,0.2)', 
              background: ctx?.secondarySelection?.kind === 'track' && ctx?.secondarySelection?.id === 'ds' ? 'rgba(255,128,0,0.2)' : 'rgba(255,128,0,0.05)', 
              color: ctx ? '#fff' : '#888', fontSize: 8
            }}
          >
            S:DS
          </button>
          <button
            disabled={!ctx}
            onClick={() => ctx?.setSecondarySelection({ kind: 'program', id: 'bsn' })}
            style={{
              cursor: ctx ? 'pointer' : 'not-allowed', padding: '2px 4px', borderRadius: 3, 
              border: '1px solid rgba(255,255,255,0.2)', 
              background: ctx?.secondarySelection?.kind === 'program' && ctx?.secondarySelection?.id === 'bsn' ? 'rgba(255,128,0,0.2)' : 'rgba(255,128,0,0.05)', 
              color: ctx ? '#fff' : '#888', fontSize: 8
            }}
          >
            S:BSN
          </button>
          <button
            disabled={!ctx}
            onClick={() => ctx?.clearSecondarySelection()}
            style={{
              cursor: ctx ? 'pointer' : 'not-allowed', padding: '2px 4px', borderRadius: 3, 
              border: '1px solid rgba(255,255,255,0.2)', background: ctx ? 'rgba(255,0,0,0.1)' : 'rgba(255,255,255,0.05)', 
              color: ctx ? '#fff' : '#888', fontSize: 8
            }}
          >
            Clear S
          </button>
        </div>
        <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <button
            disabled={!ctx}
            onClick={() => {
              // DS vs Nursing test
              ctx?.setPrimarySelection({ kind: 'track', id: 'ds' });
              ctx?.setSecondarySelection({ kind: 'program', id: 'bsn' });
            }}
            style={{
              cursor: ctx ? 'pointer' : 'not-allowed', padding: '2px 4px', borderRadius: 3, 
              border: '1px solid rgba(255,255,255,0.2)', background: ctx ? 'rgba(128,255,128,0.1)' : 'rgba(255,255,255,0.05)', 
              color: ctx ? '#fff' : '#888', fontSize: 8
            }}
          >
            DS⇔BSN
          </button>
          <button
            disabled={!ctx}
            onClick={() => {
              // SE vs DS test
              ctx?.setPrimarySelection({ kind: 'track', id: 'se' });
              ctx?.setSecondarySelection({ kind: 'track', id: 'ds' });
            }}
            style={{
              cursor: ctx ? 'pointer' : 'not-allowed', padding: '2px 4px', borderRadius: 3, 
              border: '1px solid rgba(255,255,255,0.2)', background: ctx ? 'rgba(128,255,128,0.1)' : 'rgba(255,255,255,0.05)', 
              color: ctx ? '#fff' : '#888', fontSize: 8
            }}
          >
            SE⇔DS
          </button>
          <button
            disabled={!ctx}
            onClick={() => {
              // CS vs IT test
              ctx?.setPrimarySelection({ kind: 'program', id: 'bs_cs' });
              ctx?.setSecondarySelection({ kind: 'program', id: 'bs_it' });
            }}
            style={{
              cursor: ctx ? 'pointer' : 'not-allowed', padding: '2px 4px', borderRadius: 3, 
              border: '1px solid rgba(255,255,255,0.2)', background: ctx ? 'rgba(128,255,128,0.1)' : 'rgba(255,255,255,0.05)', 
              color: ctx ? '#fff' : '#888', fontSize: 8
            }}
          >
            CS⇔IT
          </button>
        </div>
      </div>

      <div style={{ marginTop: 4 }}>
        {/* Live Context State */}
        <div style={{ marginBottom: 6, fontSize: 10, opacity: 0.8 }}>
          <div>Context: {ctx ? 'CONNECTED' : 'MISSING'}</div>
          <div>Active: {probe?.activeKey || ctx?.activeKey || 'none'}</div>
          <div>Hovered: {probe?.hoveredKey || ctx?.hoveredKey || 'none'}</div>
          <div>Locked: {probe?.lockedKey || ctx?.lockedKey || 'none'}</div>
        </div>
        
        <div><strong>Status:</strong> {result}</div>
        {details && (
          <div style={{ marginTop: 6, opacity: 0.9 }}>
            <div>Headers: {details.headers}</div>
            <div>Bad handles: {details.badHandles}</div>
            <div>Dangling edges: {details.dangling}</div>
            {details.before && (
              <>
                <div>Dim (before): {details.before.nodes} nodes / {details.before.edges} edges</div>
                <div>Dim (hover): {details.afterHover?.nodes} / {details.afterHover?.edges}</div>
                <div>Dim (lock): {details.afterLock?.nodes} / {details.afterLock?.edges}</div>
                <div>Dim (after leave): {details.afterLeave?.nodes} / {details.afterLeave?.edges}</div>
              </>
            )}
            
            {/* Live membership distribution */}
            <div style={{ fontSize: 10, opacity: 0.9, marginTop: 6, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 4 }}>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>Live Membership:</div>
              {(() => {
                const nodes = getNodes();
                const reqNodes = nodes.filter(n => n.type === 'requirement');
                const membership = reqNodes.reduce((acc: any, n: any) => {
                  const d = n.data || {};
                  const tid = d.track_id ?? (d.block?.track_id ?? null);
                  acc.tracks[tid ?? 'shared'] = (acc.tracks[tid ?? 'shared'] || 0) + 1;
                  return acc;
                }, { tracks: {} as Record<string, number> });
                
                return (
                  <>
                    <div>Total req nodes: {reqNodes.length}</div>
                    <div>Track dist: {JSON.stringify(membership.tracks)}</div>
                  </>
                );
              })()}
            </div>

            {debugInfo && (
              <details style={{ marginTop: 6, fontSize: 10 }}>
                <summary style={{ cursor: 'pointer', opacity: 0.7 }}>Full Debug Info</summary>
                <pre style={{ whiteSpace: 'pre-wrap', marginTop: 4, opacity: 0.8 }}>{debugInfo}</pre>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}