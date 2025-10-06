import React, { useEffect, useRef } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { HelpCircle, Clock } from 'lucide-react';
import { useNodeResize } from '@/hooks/useNodeResize';

interface PlaceholderNodeData {
  label?: string;
  description?: string;
  requiredCredits?: number;
  area?: string;
}

export const PlaceholderGroup: React.FC<NodeProps> = ({ id, data, selected }) => {
  const placeholderData = data as PlaceholderNodeData;
  const { label, description, requiredCredits, area } = placeholderData;
  const nodeRef = useRef<HTMLDivElement>(null);
  const { attachResizeObserver, detachResizeObserver } = useNodeResize(id);

  useEffect(() => {
    if (nodeRef.current) {
      attachResizeObserver(nodeRef.current);
      return () => detachResizeObserver();
    }
  }, [attachResizeObserver, detachResizeObserver]);

  return (
    <div
      ref={nodeRef}
      className={`
        relative min-w-[180px] p-3 rounded-lg border-2 border-dashed border-muted-foreground/50 
        bg-muted/30 transition-all duration-200
        ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}
      `}
      data-testid="placeholder-node"
      data-node-type="placeholder"
    >
      {/* Handles for connections */}
      <Handle id="in" type="target" position={Position.Top} />
      <Handle id="out" type="source" position={Position.Bottom} />
      
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-full bg-muted-foreground/20">
          <HelpCircle className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-sm text-foreground/80">
            {String(label || 'Elective Requirement')}
          </h3>
          {area && (
            <p className="text-xs text-muted-foreground">{String(area)} Area</p>
          )}
        </div>
      </div>
      
      {description && (
        <p className="text-xs text-muted-foreground mb-2">{String(description)}</p>
      )}
      
      <div className="flex items-center gap-2">
        <Clock className="w-3 h-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          {requiredCredits ? `${requiredCredits} credits` : 'Variable credits'}
        </span>
      </div>
    </div>
  );
};