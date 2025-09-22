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
  return (window as any).__flowNodes__ ?? [];
}

function getEdges(): EdgeLike[] {
  return (window as any).__flowEdges__ ?? [];
}

function countDimmed(nodes = getNodes(), edges = getEdges()) {
  const nodesDim = nodes.filter(n => !n.hidden && (n.data?.__dim === 1 || (n.style?.opacity ?? 1) < 1)).length;
  const edgesDim = edges.filter(e => (e as any).data?.__dim === 1 || ((e as any).style?.opacity ?? 1) < 1).length;
  return { nodesDim, edgesDim };
}

export default function HighlightDiagnostics() {
  const ctx = (() => { try { return usePathHighlight(); } catch { return null; } })();
  const [result, setResult] = React.useState<string>('Idle');
  const [details, setDetails] = React.useState<any>(null);

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
      setResult(pass ? 'PASS (partial)' : 'FAIL (partial)');
      setDetails({ headers: headers.length, before, badHandles: badHandles.length, dangling: dangling.length, note: 'No context or no headers' });
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
            (afterHover.nodesDim >= before.nodesDim) &&
            (afterLeave.nodesDim >= afterHover.nodesDim) &&
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

      <div style={{ marginTop: 4 }}>
        <div><strong>Status:</strong> {result}</div>
        {details && (
          <div style={{ marginTop: 6, opacity: 0.9 }}>
            <div>Headers: {details.headers}</div>
            <div>Bad handles: {details.badHandles}</div>
            <div>Dangling edges: {details.dangling}</div>
            {details.before && (
              <>
                <div>Dim (before): {details.before.nodesDim} nodes / {details.before.edgesDim} edges</div>
                <div>Dim (hover): {details.afterHover?.nodesDim} / {details.afterHover?.edgesDim}</div>
                <div>Dim (lock): {details.afterLock?.nodesDim} / {details.afterLock?.edgesDim}</div>
                <div>Dim (after leave): {details.afterLeave?.nodesDim} / {details.afterLeave?.edgesDim}</div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}