// TrackOverlayPOC.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ReactFlow, Background, Controls, Node, Edge, NodeTypes, ReactFlowInstance } from '@xyflow/react';

export type TrackId = string;
export interface TrackDefinition { id: TrackId; name: string; blockIds: string[]; }
export const eid = (s: string, t: string) => `e-${String(s)}-${String(t)}`;

// 9-node mini graph: shared foundation -> branch -> converge (terminal)
const NODES: Node[] = [
  { id: '1', position: { x: 0,   y: 50 },  data: { label: 'Foundation 1', blockId: '1' }, type: 'default' },
  { id: '2', position: { x: 120, y: 50 },  data: { label: 'Foundation 2', blockId: '2' }, type: 'default' },
  { id: '3', position: { x: 240, y: 50 },  data: { label: 'Foundation 3', blockId: '3' }, type: 'default' },
  { id: '4', position: { x: 360, y: 50 },  data: { label: 'Branch Point', blockId: '4' }, type: 'default' },
  { id: '5', position: { x: 480, y: -40 }, data: { label: 'A1', blockId: '5' }, type: 'default' },
  { id: '6', position: { x: 600, y: -40 }, data: { label: 'A2', blockId: '6' }, type: 'default' },
  { id: '7', position: { x: 480, y: 140 }, data: { label: 'B1', blockId: '7' }, type: 'default' },
  { id: '8', position: { x: 600, y: 140 }, data: { label: 'B2', blockId: '8' }, type: 'default' },
  { id: '9', position: { x: 720, y: 50 },  data: { title: 'Degree XYZ', blockId: '9' }, type: 'terminalNode' },
];

const EDGES: Edge[] = [
  { id: eid('1','2'), source: '1', target: '2' },
  { id: eid('2','3'), source: '2', target: '3' },
  { id: eid('3','4'), source: '3', target: '4' },
  { id: eid('4','5'), source: '4', target: '5' },
  { id: eid('5','6'), source: '5', target: '6' },
  { id: eid('6','9'), source: '6', target: '9' },
  { id: eid('4','7'), source: '4', target: '7' },
  { id: eid('7','8'), source: '7', target: '8' },
  { id: eid('8','9'), source: '8', target: '9' },
];

const TRACKS: TrackDefinition[] = [
  { id: 'se', name: 'Software Engineering', blockIds: ['1','2','3','4','5','6','9'] },
  { id: 'ds', name: 'Data Science',         blockIds: ['1','2','3','4','7','8','9'] },
];

const DefaultNode: React.FC<{ id: string; data: any }> = React.memo(({ id, data }) => (
  <div className="node-content">{data.label ?? id}</div>
));
const TerminalNode: React.FC<{ id: string; data: any }> = React.memo(({ data }) => (
  <div className="node-content degree-node">🎓 {String(data.title)}</div>
));
const nodeTypes: NodeTypes = { default: DefaultNode, terminalNode: TerminalNode };

export default function TrackOverlayPOC() {
  const [rf, setRf] = useState<ReactFlowInstance | null>(null);
  const [primary, setPrimary] = useState<TrackDefinition | undefined>(TRACKS[0]);
  const [comparison, setComparison] = useState<TrackDefinition | undefined>(TRACKS[1]);
  const [enabled, setEnabled] = useState(true);
  const overlayOn = !!(enabled && primary);

  const highlights = useMemo(() => {
    const toEdgeIds = (seq: string[]) => seq.slice(0, -1).map((s, i) => eid(s, seq[i + 1]));
    const pNodes = new Set(primary?.blockIds ?? []);
    const cNodes = new Set(comparison?.blockIds ?? []);
    const pEdges = new Set(primary ? toEdgeIds(primary.blockIds) : []);
    const cEdges = new Set(comparison ? toEdgeIds(comparison.blockIds) : []);
    const bothNodes = new Set([...pNodes].filter((id) => cNodes.has(id)));
    const bothEdges = new Set([...pEdges].filter((id) => cEdges.has(id)));
    return {
      bothNodes,
      bothEdges,
      pOnlyNodes: new Set([...pNodes].filter((id) => !bothNodes.has(id))),
      cOnlyNodes: new Set([...cNodes].filter((id) => !bothNodes.has(id))),
      pOnlyEdges: new Set([...pEdges].filter((id) => !bothEdges.has(id))),
      cOnlyEdges: new Set([...cEdges].filter((id) => !bothEdges.has(id))),
    };
  }, [primary, comparison]);

  const elements = useMemo(() => {
    if (!overlayOn) return { nodes: NODES, edges: EDGES };
    const nodes = NODES.map((n) => {
      const bid = String(n.data?.blockId ?? n.id);
      const merged = [n.className, 'node'];
      if (highlights.bothNodes.has(bid)) merged.push('node--both');
      else if (highlights.pOnlyNodes.has(bid)) merged.push('node--primary');
      else if (highlights.cOnlyNodes.has(bid)) merged.push('node--comparison');
      else merged.push('node--dim');
      return { ...n, className: merged.filter(Boolean).join(' ') };
    });
    const edges = EDGES.map((e) => {
      const merged = [e.className, 'edge'];
      if (highlights.bothEdges.has(e.id)) merged.push('edge--both');
      else if (highlights.pOnlyEdges.has(e.id)) merged.push('edge--primary');
      else if (highlights.cOnlyEdges.has(e.id)) merged.push('edge--comparison');
      else merged.push('edge--dim');
      return { ...e, className: merged.filter(Boolean).join(' ') };
    });
    return { nodes, edges };
  }, [overlayOn, highlights]);

  const didFitRef = useRef(false);
  useEffect(() => {
    if (!rf || !overlayOn) { didFitRef.current = false; return; }
    if (didFitRef.current || !elements.nodes.length) return;
    const t = setTimeout(() => {
      rf.fitView({ padding: 0.2, duration: 800 });
      didFitRef.current = true;
      console.log('[POC] fitView executed');
    }, 60);
    return () => clearTimeout(t);
  }, [rf, overlayOn, elements.nodes.length]);

  return (
    <div style={{ height: 420, position: 'relative' }}>
      <div style={{ position: 'absolute', zIndex: 5, display: 'flex', gap: 8, padding: 8 }}>
        <select
          value={primary?.id ?? ''}
          onChange={(e) => setPrimary(TRACKS.find(t => t.id === e.target.value))}
          data-testid="primary-track"
        >
          {TRACKS.map(t => <option key={t.id} value={t.id}>{t.name} (primary)</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Enable comparison
        </label>
        <select
          value={comparison?.id ?? ''}
          onChange={(e) => setComparison(TRACKS.find(t => t.id === e.target.value))}
          disabled={!enabled}
          data-testid="comparison-track"
        >
          {TRACKS.filter(t => t.id !== primary?.id).map(t =>
            <option key={t.id} value={t.id}>{t.name} (comparison)</option>
          )}
        </select>
      </div>

      <ReactFlow
        nodes={elements.nodes}
        edges={elements.edges}
        nodeTypes={nodeTypes}
        onInit={(inst) => setRf(inst)}
        fitView={false}
        defaultViewport={{ x: 0, y: 0, zoom: 0.85 }}
        style={{ width: '100%', height: '100%' }}
      >
        <Background color="#bbb" gap={16} />
        <Controls />
      </ReactFlow>

      <style>
      {`
      .node-content { min-width: 64px; padding: 6px 8px; border: 2px solid #999; border-radius: 6px; background:#fff; font-size:12px; text-align:center; }
      .degree-node { font-weight: 700; }
      
      /* Edge highlight modifiers - target the actual path */
      .react-flow__edge.edge--primary .react-flow__edge-path {
        stroke: #0969da !important;
        stroke-width: 3px !important;
        opacity: 1 !important;
        stroke-linecap: round !important;
        transition: stroke 120ms, opacity 120ms, stroke-width 120ms !important;
        filter: drop-shadow(0 0 4px rgba(0, 123, 255, 0.3)) !important;
      }
      
      .react-flow__edge.edge--comparison .react-flow__edge-path {
        stroke: #ff9300 !important;
        stroke-width: 3px !important;
        stroke-dasharray: 6 !important;
        opacity: 1 !important;
        stroke-linecap: round !important;
        transition: stroke 120ms, opacity 120ms, stroke-width 120ms !important;
        filter: drop-shadow(0 0 4px rgba(255, 147, 0, 0.3)) !important;
      }
      
      .react-flow__edge.edge--both .react-flow__edge-path {
        stroke: #6f42c1 !important;
        stroke-width: 4px !important;
        opacity: 1 !important;
        stroke-linecap: round !important;
        transition: stroke 120ms, opacity 120ms, stroke-width 120ms !important;
        filter: drop-shadow(0 0 6px rgba(111, 66, 193, 0.4)) !important;
      }
      
      .react-flow__edge.edge--dim .react-flow__edge-path {
        stroke: #b9b9b9 !important;
        stroke-width: 2px !important;
        opacity: 0.4 !important;
        stroke-linecap: round !important;
        transition: stroke 120ms, opacity 120ms, stroke-width 120ms !important;
      }
      
      .node--primary { border-color:#0969da; background:#e7f1ff; }
      .node--comparison { border-color:#ff9300; background:#fff5e6; }
      .node--both { border-color:#6f42c1; background:#f5e6ff; }
      .node--dim { opacity:.25; filter: grayscale(60%); }
      `}
      </style>
    </div>
  );
}