import React from 'react';
import { Handle, Position } from '@xyflow/react';

export interface V3YearNodeData {
  title?: string;
  year?: number;
  [key: string]: any;
}

interface V3YearNodeProps {
  data: V3YearNodeData;
}

export default function V3YearNode({ data }: V3YearNodeProps) {
  return (
    <div className="min-w-[120px]">
      <div className="px-4 py-2 bg-background/80 backdrop-blur-sm border rounded-lg">
        <div className="text-lg font-bold text-center">
          {data.title || `Year ${data.year || '?'}`}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} id="out" />
    </div>
  );
}
