/**
 * GhostCourseNode - Alternative course option for Plan B comparison
 * Rendered with 50% opacity and dashed border when Compare overlay is active
 */
import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { PlanNodeData } from '../../types/v4';

interface GhostCourseNodeProps {
  data: PlanNodeData;
  selected?: boolean;
}

export function GhostCourseNode({ data, selected }: GhostCourseNodeProps) {
  return (
    <div 
      className={`
        px-4 py-3 rounded-lg border-2 border-dashed
        bg-purple-500/10 border-purple-500/50 text-purple-700 dark:text-purple-300
        transition-all duration-200
        min-w-[100px]
        opacity-60
        ${selected ? 'ring-2 ring-purple-500 ring-offset-2' : ''}
      `}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <div className="text-center">
        <div className="text-[10px] font-semibold uppercase mb-1 opacity-75">
          Alternative
        </div>
        <div className="font-semibold text-sm">{data.label}</div>
        {data.credits && (
          <div className="text-xs opacity-75 mt-1">{data.credits} cr</div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}
