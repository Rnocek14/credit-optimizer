/**
 * GhostCourseNode - Alternative course option for Plan B comparison
 * Rendered with 50% opacity and dashed border when Compare overlay is active
 */
import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { PlanNodeData } from '../../types/v4';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface GhostCourseNodeProps {
  data: PlanNodeData;
  selected?: boolean;
}

export function GhostCourseNode({ data, selected }: GhostCourseNodeProps) {
  const tooltipText = data.alternativeFor 
    ? `Plan B alternative for ${data.alternativeFor}.\nLighter prerequisites, saves time.`
    : "Plan B alternative course";
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={`
              rounded-lg border-2 border-dashed
              bg-purple-500/10 border-purple-500/50 text-purple-700 dark:text-purple-300
              transition-all duration-200
              min-w-[200px]
              opacity-60
              cursor-help
              ${selected ? 'ring-2 ring-purple-500 ring-offset-2' : ''}
            `}
          >
            <Handle type="target" position={Position.Top} className="opacity-0" />
            
            {/* Header */}
            <div className="px-3 py-2 space-y-1">
              <div className="text-[10px] font-semibold uppercase opacity-75">
                Alternative
              </div>
              <div className="font-semibold text-sm leading-tight">{data.label}</div>
              {data.credits && (
                <span className="text-xs font-medium opacity-90">{data.credits} cr</span>
              )}
            </div>
            
            <Handle type="source" position={Position.Bottom} className="opacity-0" />
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-xs whitespace-pre-line">{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
