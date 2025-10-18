/**
 * SpineNode - Year marker nodes in the horizontal spine with progress summary
 */
import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { PlanNodeData } from '../../types/v4';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface SpineNodeProps {
  data: PlanNodeData & {
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
  };
  selected?: boolean;
}

export function SpineNode({ data, selected }: SpineNodeProps) {
  const summary = data.creditsSummary;
  const health = data.loadHealth;
  const collapsedSummary = data.collapsedSummary;
  const { isCollapsed = false, onToggleCollapse } = data;
  
  console.log('[SpineNode Render] 🎨', {
    label: data.label,
    isCollapsed,
    hasToggleHandler: !!onToggleCollapse,
    dataKeys: Object.keys(data)
  });
  
  const handleToggleClick = (e: React.MouseEvent) => {
    console.log('[SpineNode] 🖱️ Toggle clicked!', data.label);
    e.stopPropagation();
    onToggleCollapse?.();
  };
  
  return (
    <div 
      data-type={data.type || 'year'}
      className={`
        nodrag
        px-6 py-3 rounded-lg border-2
        ${isCollapsed ? 'bg-primary/5 border-primary border-dashed opacity-80' : 'bg-primary/10 border-primary'}
        text-primary font-semibold
        transition-all duration-200
        min-w-[180px] h-[120px]
        flex flex-col justify-center
        ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}
      `}
    >
      <Handle 
        type="target" 
        position={Position.Left} 
        className="opacity-0"
        style={{ top: 60 }}
      />
      
      <div className="space-y-2 overflow-hidden max-h-[96px]">
        {/* Year Label with Toggle */}
        <div className="flex items-center justify-center gap-2 text-sm">
          <span className="whitespace-nowrap">{data.label}</span>
          {data.onToggleCollapse && (
            <button
              onClick={handleToggleClick}
              className="p-0.5 hover:bg-primary/20 rounded transition-colors cursor-pointer"
              aria-label={isCollapsed ? "Expand year" : "Collapse year"}
            >
              {isCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
        
        {isCollapsed ? (
          /* Collapsed State - Show compact summary */
          collapsedSummary && (
            <div className="space-y-1">
              <div className="text-center">
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                  {collapsedSummary.moduleCount} modules hidden
                </Badge>
              </div>
              <div className="text-center text-[10px] text-primary/70">
                {collapsedSummary.completedModules}/{collapsedSummary.moduleCount} complete
              </div>
              {collapsedSummary.totalCredits > 0 && (
                <div className="text-center text-[9px] text-primary/60">
                  {collapsedSummary.totalCredits} cr total
                </div>
              )}
            </div>
          )
        ) : (
          /* Expanded State - Show existing details */
          <>
            {/* Credit Summary */}
            {summary && (
              <div className="space-y-1">
                <Progress 
                  value={(summary.planned / summary.required) * 100} 
                  className="h-1.5"
                />
                <div className="text-center text-[10px] text-primary/70">
                  {summary.planned} / {summary.required} cr
                </div>
              </div>
            )}
            
            {/* Load Health */}
            {health && (
              <div className="flex justify-center">
                <Badge 
                  variant={health === 'balanced' ? 'default' : 'secondary'}
                  className="text-[9px] px-1.5 py-0"
                >
                  {health === 'underloaded' ? '🟡 Light' : 
                   health === 'overloaded' ? '🔴 Heavy' : 
                   '🟢 Balanced'}
                </Badge>
              </div>
            )}
            
            {/* Missing Requirements */}
            {data.missingRequirements && data.missingRequirements.length > 0 && (
              <div className="text-center text-[9px] text-destructive">
                ⚠️ {data.missingRequirements[0]}
                {data.missingRequirements.length > 1 && ` +${data.missingRequirements.length - 1}`}
              </div>
            )}
          </>
        )}
      </div>
      
      <Handle 
        type="source" 
        position={Position.Right} 
        className="opacity-0"
        style={{ top: 60 }}
      />
    </div>
  );
}
