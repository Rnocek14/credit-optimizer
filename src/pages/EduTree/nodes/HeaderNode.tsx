import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { usePathHighlight } from '../ctx/PathHighlightContext';

export interface HeaderNodeData {
  label: string;
  [key: string]: unknown; // Index signature for ReactFlow compatibility
}

function keyFromId(id: string): `${'program'|'track'}:${string}` | null {
  console.log('[HeaderNode] keyFromId called with id:', id);
  if (id.startsWith('program-header:')) {
    const key = `program:${id.split(':')[1]}` as `program:${string}`;
    console.log('[HeaderNode] Extracted program key:', key);
    return key;
  }
  if (id.startsWith('track-header:')) {
    const trackId = id.split(':')[1];
    // Special case: IT is actually a program, not a track
    if (trackId === 'information-technology') {
      const key = `program:bs_it` as `program:${string}`;
      console.log('[HeaderNode] Mapped IT track to program key:', key);
      return key;
    }
    // Map track names to track codes
    const trackCode = trackId === 'software-engineering' ? 'se' : 
                     trackId === 'data-science' ? 'ds' : trackId;
    const key = `track:${trackCode}` as `track:${string}`;
    console.log('[HeaderNode] Extracted track key:', key);
    return key;
  }
  console.log('[HeaderNode] No key extracted for id:', id);
  return null;
}

export default function HeaderNode({ id, data }: { id: string; data: HeaderNodeData }) {
  const [isFocused, setIsFocused] = React.useState(false);
  const ctx = usePathHighlight();
  const k = keyFromId(id || '');

// Detect compare-any via URL param (keeps this component decoupled)
const isCompareAny = React.useMemo(() => {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('filterMode') === 'compare-any';
  } catch {
    return false;
  }
}, []);

  const toSelection = (key: string) => {
    const [kind, id] = key.split(':');
    if (kind !== 'program' && kind !== 'track') return null;
    return { kind, id } as const;
  };

  const locked = k ? ctx.lockedKey === k : false;
  const isActive = k ? ctx.activeKey === k : false;

  console.log('[HeaderNode] Render state:', {
    id,
    extractedKey: k,
    activeKey: ctx.activeKey,
    lockedKey: ctx.lockedKey,
    locked,
    isActive,
    label: data.label
  });
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!k) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (isCompareAny) {
        const sel = toSelection(k);
        if (!sel) return;
        if (e.shiftKey) {
          ctx.setSecondarySelection(sel);
        } else {
          ctx.setPrimarySelection(sel);
        }
        // clear legacy hover/lock so dual-selection is the single source of truth
        ctx.clearPreview();
      } else {
        ctx.toggleLock(k);
      }
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={locked}
      aria-label={`Highlight ${data.label ?? 'path'}`}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => {
        console.log('[HeaderNode] Mouse enter, calling preview with key:', k);
        k && ctx.preview(k);
      }}
      onMouseLeave={() => {
        console.log('[HeaderNode] Mouse leave, calling clearPreview');
        ctx.clearPreview();
      }}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onClick={(e) => {
        if (!k) return;

        if (isCompareAny) {
          const sel = toSelection(k);
          if (!sel) return;
          if (e.shiftKey || e.ctrlKey || e.metaKey) {
            ctx.setSecondarySelection(sel);
          } else {
            ctx.setPrimarySelection(sel);
          }
          // clear legacy hover/lock so dual-selection is the single source of truth
          ctx.clearPreview();
        } else {
          ctx.toggleLock(k);
        }
      }}
      style={{
        pointerEvents: 'auto', // Enable keyboard interaction
        padding: '4px 10px',
        borderRadius: 999,
        background: locked ? 'rgba(180,220,255,0.2)' : isActive ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)',
        border: `1px solid ${locked ? 'rgba(180,220,255,0.8)' : (isFocused || isActive) ? 'rgba(180,220,255,0.6)' : 'rgba(255,255,255,0.18)'}`,
        color: locked ? 'rgba(180,220,255,1)' : isActive ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.9)',
        fontSize: 12,
        lineHeight: '16px',
        backdropFilter: 'blur(2px)',
        boxShadow: (isFocused || locked)
          ? '0 0 0 2px rgba(180,220,255,0.3), 0 0 0 1px rgba(0,0,0,0.25) inset'
          : '0 0 0 1px rgba(0,0,0,0.25) inset',
        zIndex: 1000, // Ensure headers sit well above edges
        position: 'relative',
        left: '-60px', // Offset so arrow meets badge edge cleanly
        cursor: 'pointer',
        outline: 'none'
      }}
    >
      {data.label}
      {/* Hidden handles for edge connections */}
      <Handle 
        type="target" 
        id="in" 
        position={Position.Left}
        style={{ 
          insetInlineStart: -8,
          insetBlockStart: '50%',
          transform: 'translateY(-50%)',
          opacity: 0,
          width: 1,
          height: 1,
          pointerEvents: 'auto' // Allow handle to be hit for edge connections
        }}
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        style={{ opacity: 0, pointerEvents: 'none' }}
        id="source"
      />
    </div>
  );
}