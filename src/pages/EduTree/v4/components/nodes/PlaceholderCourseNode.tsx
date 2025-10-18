/**
 * PlaceholderCourseNode - Visual distinction for requirement choice points
 * Dashed border, help icon, prominent "Browse Options" CTA
 */
import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { HelpCircle, ChevronRight } from 'lucide-react';
import { PlanNodeData } from '../../types/v4';

interface PlaceholderNodeData extends PlanNodeData {
  area?: string;
  description?: string;
  onBrowseOptions?: () => void;
}

export function PlaceholderCourseNode({ data }: NodeProps) {
  const nodeData = data as unknown as PlaceholderNodeData;
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nodeData.onBrowseOptions) {
      nodeData.onBrowseOptions();
    }
  };

  return (
    <div 
      className="relative group cursor-pointer animate-fade-in"
      onClick={handleClick}
    >
      {/* Dashed border container with pulsing animation on hover */}
      <div className="
        w-[200px] min-h-[100px]
        border-2 border-dashed border-muted-foreground/40
        bg-muted/20 backdrop-blur-sm
        rounded-lg
        transition-all duration-300
        hover:border-primary/50 hover:bg-muted/40 hover:shadow-lg
        group-hover:scale-[1.02]
      ">
        {/* Help icon badge */}
        <div className="absolute -top-2 -left-2 w-6 h-6 bg-background border-2 border-dashed border-muted-foreground/40 rounded-full flex items-center justify-center group-hover:border-primary/50 transition-colors">
          <HelpCircle className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>

        <div className="p-3 space-y-2">
          {/* Label with "Choose:" prefix */}
          <div className="space-y-1">
            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
              Choose:
            </div>
            <div className="font-semibold text-sm leading-tight text-foreground/90">
              {nodeData.label}
            </div>
          </div>

          {/* Credits and area */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {nodeData.credits && (
              <div className="px-2 py-0.5 bg-background/50 rounded border border-border">
                {nodeData.credits} cr
              </div>
            )}
            {nodeData.area && (
              <div className="flex-1 truncate">
                {nodeData.area}
              </div>
            )}
          </div>

          {/* Description (optional) */}
          {nodeData.description && (
            <div className="text-[10px] text-muted-foreground/80 leading-tight line-clamp-2">
              {nodeData.description}
            </div>
          )}

          {/* Browse Options CTA */}
          <div className="pt-1">
            <div className="
              w-full px-3 py-1.5 
              bg-primary/10 hover:bg-primary/20
              border border-primary/30 hover:border-primary/50
              rounded-md
              text-xs font-medium text-primary
              flex items-center justify-center gap-1
              transition-all duration-200
              group-hover:shadow-sm
            ">
              Browse Options
              <ChevronRight className="h-3 w-3" />
            </div>
          </div>
        </div>
      </div>

      {/* Connection handles (invisible) */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-muted-foreground/20 !border-muted-foreground/40 !w-2 !h-2"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-muted-foreground/20 !border-muted-foreground/40 !w-2 !h-2"
      />
    </div>
  );
}
