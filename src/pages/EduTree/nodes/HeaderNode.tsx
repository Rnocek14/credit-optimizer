import React from 'react';
import { Handle, Position } from '@xyflow/react';

export interface HeaderNodeData {
  label: string;
  [key: string]: unknown; // Index signature for ReactFlow compatibility
}

export default function HeaderNode({ data }: { data: HeaderNodeData }) {
  const [isFocused, setIsFocused] = React.useState(false);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      // Future: toggle filter when header is focused
      console.log('[HeaderNode] Key pressed:', e.key, 'on', data.label);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${data.label} header - press Enter or Space to interact`}
      onKeyDown={handleKeyDown}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={{
        pointerEvents: 'auto', // Enable keyboard interaction
        padding: '4px 10px',
        borderRadius: 999,
        background: 'rgba(255,255,255,0.08)',
        border: `1px solid ${isFocused ? 'rgba(180,220,255,0.6)' : 'rgba(255,255,255,0.18)'}`,
        color: 'rgba(255,255,255,0.9)',
        fontSize: 12,
        lineHeight: '16px',
        backdropFilter: 'blur(2px)',
        boxShadow: isFocused 
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