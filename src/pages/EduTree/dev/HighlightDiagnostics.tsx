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
  const ctx = (() => { try { return usePathHighlight(); } catch { return null; } })();
  const [result, setResult] = React.useState<string>('Idle');
  const [details, setDetails] = React.useState<any>(null);
  const [debugInfo, setDebugInfo] = React.useState<string>('');
  
  // Live context state (updates in real-time)
  const probe = (window as any).__highlight_state__ || null;

  const run = React.useCallback(() => {
    const nodes = getNodes();
    const edges = getEdges();
    const headers = nodes.filter(n => n.id?.startsWith?.('program-header:') || n.id?.startsWith?.('track-header:'));
    const headerKey = headers.length ? keyFromHeaderId(headers[0].id) : null;

    const badHandles = edges.filter(e =>
      e.sourceHandle === null || e.sourceHandle === 'null' || e.targetHandle === 'null'
    );

    const ids = new Set(nodes.filter(n => !n.hidden).map(n => n.id));
    const dangling = edges.filter(e => !ids.has(e.source) || !ids.has(e.target));

    const before = countDimmed(nodes, edges);

    // If context not available or no headers, bail early but show what we have.
    if (!ctx || !headerKey) {
      const pass = badHandles.length === 0 && dangling.length === 0 && headers.length > 0;
      const debugText = [
        `Context available: ${!!ctx}`,
        `Headers found: ${headers.map(h => h.id).join(', ')}`,
        `Sample node data: ${nodes[0]?.data ? JSON.stringify(nodes[0].data, null, 2) : 'none'}`,
        `Active key: ${ctx?.activeKey || 'none'}`,
      ].join('\n');
      
      setResult(pass ? 'PASS (partial)' : 'FAIL (partial)');
      setDetails({ headers: headers.length, before, badHandles: badHandles.length, dangling: dangling.length, note: 'No context or no headers' });
      setDebugInfo(debugText);
      return;
    }

    // Step 1: hover preview
    ctx.preview(headerKey);

    setTimeout(() => {
      const afterHover = countDimmed();

      // Step 2: lock
      ctx.toggleLock(headerKey);

      setTimeout(() => {
        const afterLock = countDimmed();

        // Step 3: clear hover (lock should persist)
        ctx.clearPreview();

        setTimeout(() => {
          const afterLeave = countDimmed();

          const gp = (window as any).gatePositions || null;

          const pass =
            (headers.length > 0) &&
            (afterHover.nodes >= before.nodes) &&
            (afterLeave.nodes >= afterHover.nodes) &&
            badHandles.length === 0 &&
            dangling.length === 0;

          setResult(pass ? 'PASS' : 'FAIL');
          setDetails({
            headers: headers.length,
            before,
            afterHover,
            afterLock,
            afterLeave,
            badHandles: badHandles.length,
            dangling: dangling.length,
            gatePositions: gp
          });
          
          const debugText = [
            `Headers found: ${headers.map(h => h.id).join(', ')}`,
            `Active key: ${ctx?.activeKey || 'none'}`,
            `Hovered key: ${ctx?.hoveredKey || 'none'}`, 
            `Locked key: ${ctx?.lockedKey || 'none'}`,
            `Sample node data: ${nodes[0]?.data ? JSON.stringify(nodes[0].data, null, 2) : 'none'}`,
            `Node types: ${[...new Set(nodes.map(n => n.type))].join(', ')}`,
            `Edge types: ${[...new Set(edges.map(e => e.type))].join(', ')}`,
          ].join('\n');
          setDebugInfo(debugText);
        }, 60);
      }, 60);
    }, 60);
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
            onClick={() => ctx?.toggleLock('track:se')}
            style={{
              cursor: ctx ? 'pointer' : 'not-allowed', padding: '3px 6px', borderRadius: 4, 
              border: '1px solid rgba(255,255,255,0.2)', background: ctx ? 'rgba(255,255,0,0.1)' : 'rgba(255,255,255,0.05)', 
              color: ctx ? '#fff' : '#888', fontSize: 9
            }}
          >
            🔒SE
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
            {debugInfo && (
              <details style={{ marginTop: 6, fontSize: 10 }}>
                <summary style={{ cursor: 'pointer', opacity: 0.7 }}>Debug Info</summary>
                <pre style={{ whiteSpace: 'pre-wrap', marginTop: 4, opacity: 0.8 }}>{debugInfo}</pre>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}