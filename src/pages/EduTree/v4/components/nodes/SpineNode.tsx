/**
 * SpineNode - Year marker nodes in the horizontal spine
 */
import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { PlanNodeData } from '../../types/v4';

interface SpineNodeProps {
  data: PlanNodeData;
  selected?: boolean;
}

export function SpineNode({ data, selected }: SpineNodeProps) {
  return (
    <div 
      className={`
        px-6 py-3 rounded-lg border-2
        bg-primary/10 border-primary
        text-primary font-semibold
        transition-all duration-200
        ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}
      `}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <div className="text-center whitespace-nowrap">
        {data.label}
      </div>
      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  );
}
