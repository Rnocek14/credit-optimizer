/**
 * CourseNode - Internal course bubbles
 */
import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { PlanNodeData } from '../../types/v4';

interface CourseNodeProps {
  data: PlanNodeData;
  selected?: boolean;
  onClick?: () => void;
}

export function CourseNode({ data, selected, onClick }: CourseNodeProps) {
  const getStatusColor = () => {
    switch (data.status) {
      case 'completed':
        return 'bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-300';
      case 'in-progress':
        return 'bg-blue-500/20 border-blue-500 text-blue-700 dark:text-blue-300';
      case 'planned':
        return 'bg-slate-500/20 border-slate-500 text-slate-700 dark:text-slate-300';
      default:
        return 'bg-muted border-border text-muted-foreground';
    }
  };

  return (
    <div 
      onClick={onClick}
      className={`
        px-4 py-3 rounded-lg border-2
        ${getStatusColor()}
        transition-all duration-200
        min-w-[100px]
        ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}
        ${onClick ? 'cursor-pointer hover-scale' : ''}
        ${data.selectedProviderId ? 'ring-1 ring-primary ring-offset-1' : ''}
      `}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <div className="text-center">
        <div className="font-semibold text-sm">{data.label}</div>
        {data.credits && (
          <div className="text-xs opacity-75 mt-1">{data.credits} cr</div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}
