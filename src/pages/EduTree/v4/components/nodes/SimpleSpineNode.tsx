import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronRight } from 'lucide-react';

export function SimpleSpineNode({ data, selected }: any) {
  const { 
    label, 
    isCollapsed = false,
    creditsSummary,
    loadHealth,
    collapsedSummary,
    onToggleCollapse
  } = data;
  
  return (
    <div className="nodrag nopan nowheel">
      <Handle type="target" position={Position.Left} className="opacity-0" />
      
      <div 
        className={`
          px-6 py-3 rounded-lg border-2
          ${isCollapsed ? 'bg-primary/5 border-primary border-dashed opacity-80' : 'bg-primary/10 border-primary'}
          text-primary font-semibold
          transition-all duration-200
          min-w-[180px] h-[120px]
          flex flex-col justify-center
          ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}
        `}
      >
        <div className="space-y-2">
          {/* Year Label with inline chevron button */}
          <div className="flex items-center justify-center gap-2 text-sm">
            <span>{label}</span>
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="p-1 hover:bg-primary/20 rounded transition-colors"
                type="button"
                aria-label={isCollapsed ? 'Expand year' : 'Collapse year'}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
          
          {/* Collapsed State */}
          {isCollapsed && collapsedSummary ? (
            <div className="space-y-1 text-center">
              <Badge variant="secondary" className="text-[9px]">
                {collapsedSummary.moduleCount} modules
              </Badge>
              <div className="text-[10px]">
                {collapsedSummary.completedModules}/{collapsedSummary.moduleCount} done
              </div>
            </div>
          ) : (
            /* Expanded State */
            <>
              {creditsSummary && (
                <div className="space-y-1">
                  <Progress value={(creditsSummary.planned / creditsSummary.required) * 100} className="h-1.5" />
                  <div className="text-center text-[10px]">
                    {creditsSummary.planned} / {creditsSummary.required} cr
                  </div>
                </div>
              )}
              {loadHealth && (
                <div className="flex justify-center">
                  <Badge variant={loadHealth === 'balanced' ? 'default' : 'secondary'} className="text-[9px]">
                    {loadHealth === 'underloaded' ? '🟡' : loadHealth === 'overloaded' ? '🔴' : '🟢'} {loadHealth}
                  </Badge>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  );
}
