import React from 'react';
import { Handle, Position } from '@xyflow/react';

export interface HeaderNodeData {
  label: string;
  [key: string]: unknown; // Index signature for ReactFlow compatibility
}

export default function HeaderNode({ data }: { data: HeaderNodeData }) {
  return (
    <div className="px-3 py-1 rounded-full bg-background/80 border border-border/20 text-foreground/70 text-xs tracking-wide backdrop-blur-sm">
      {data.label}
      {/* Hidden handles for edge connections */}
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{ opacity: 0, pointerEvents: 'none' }}
        id="target"
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