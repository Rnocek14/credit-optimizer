import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export interface YearSpineNodeData {
  label: string;
  year: number;
  isCollapsed: boolean;
  creditsSummary?: {
    planned: number;
    required: number;
  };
  [key: string]: unknown;
}

interface YearSpineNodeProps {
  data: YearSpineNodeData;
  selected?: boolean;
}

export function YearSpineNode({ data, selected }: YearSpineNodeProps) {
  const { label, isCollapsed, creditsSummary } = data;
  
  // Debug: Log every render
  console.log(`[YearSpineNode] Rendering ${label}:`, { isCollapsed, selected });

  return (
    <div className="year-spine-node">
      <Handle type="target" position={Position.Left} className="opacity-0" />
      
      <div 
        className={`
          px-6 py-4 rounded-lg border-2
          transition-all duration-200
          min-w-[200px] min-h-[100px]
          flex flex-col justify-center gap-2
          ${isCollapsed 
            ? 'bg-primary/5 border-primary border-dashed opacity-70' 
            : 'bg-primary/10 border-primary'
          }
          ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}
        `}
      >
        {/* Year Label with Chevron */}
        <div className="flex items-center justify-center gap-2 text-primary font-bold text-base">
          <span>{label}</span>
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
        
        {/* Credits Summary (when expanded) */}
        {!isCollapsed && creditsSummary && (
          <div className="text-center text-xs text-muted-foreground">
            {creditsSummary.planned} / {creditsSummary.required} credits
          </div>
        )}
      </div>
      
      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  );
}
