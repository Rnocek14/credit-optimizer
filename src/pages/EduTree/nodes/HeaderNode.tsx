import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { usePathHighlight } from '../ctx/PathHighlightContext';

export interface HeaderNodeData {
  label: string;
  [key: string]: unknown; // Index signature for ReactFlow compatibility
}

function keyFromId(id: string): `${'program'|'track'}:${string}` | null {
  if (id.startsWith('program-header:')) return `program:${id.split(':')[1]}`;
  if (id.startsWith('track-header:')) return `track:${id.split(':')[1]}`;
  return null;
}

export default function HeaderNode({ id, data }: { id: string; data: HeaderNodeData }) {
  const [isFocused, setIsFocused] = React.useState(false);
  const { preview, clearPreview, toggleLock, activeKey, lockedKey } = usePathHighlight();
  const k = keyFromId(id || '');

  const locked = k ? lockedKey === k : false;
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!k) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleLock(k);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={locked}
      aria-label={`Highlight ${data.label ?? 'path'}`}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => k && preview(k)}
      onMouseLeave={() => clearPreview()}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onClick={() => k && toggleLock(k)}
      style={{
        pointerEvents: 'auto', // Enable keyboard interaction
        padding: '4px 10px',
        borderRadius: 999,
        background: 'rgba(255,255,255,0.08)',
        border: `1px solid ${isFocused || locked ? 'rgba(180,220,255,0.6)' : 'rgba(255,255,255,0.18)'}`,
        color: 'rgba(255,255,255,0.9)',
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