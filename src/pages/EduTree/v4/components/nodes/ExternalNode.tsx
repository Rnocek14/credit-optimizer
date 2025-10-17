/**
 * ExternalNode - Transfer credits (CLEP, ACE, etc.)
 */
import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { PlanNodeData } from '../../types/v4';

interface ExternalNodeProps {
  data: PlanNodeData;
  selected?: boolean;
}

export function ExternalNode({ data, selected }: ExternalNodeProps) {
  return (
    <div 
      data-type={data.type || 'external'}
      onClick={() => data.onClick?.()}
      className={`
        px-3 py-2 rounded-lg border-2
        bg-amber-500/20 border-amber-500
        text-amber-900 dark:text-amber-100
        transition-all duration-200
        min-w-[90px]
        ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}
        ${data.onClick ? 'cursor-pointer hover-scale' : ''}
      `}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <div className="text-center">
        <div className="font-semibold text-xs">{data.label}</div>
        {data.source && (
          <div className="text-xs opacity-75 mt-0.5">{data.source}</div>
        )}
        {data.credits && (
          <div className="text-xs opacity-75">{data.credits} cr</div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}
