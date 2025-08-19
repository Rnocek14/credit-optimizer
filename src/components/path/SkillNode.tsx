import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, User } from 'lucide-react';
import type { PathNode as PathNodeType } from '@/stores/usePathStore';

interface SkillNodeProps {
  data: PathNodeType['data'];
  selected?: boolean;
}

export const SkillNode = memo(({ data, selected }: SkillNodeProps) => {
  return (
    <div className={`relative min-w-[200px] ${selected ? 'ring-2 ring-primary' : ''}`}>
      {/* Handles for connections */}
      <Handle 
        type="target" 
        position={Position.Left}
        className="w-2 h-2 bg-border border-2 border-background"
      />
      <Handle 
        type="source" 
        position={Position.Right}
        className="w-2 h-2 bg-border border-2 border-background"
      />

      {/* Compact skill pill */}
      <Badge 
        variant="secondary" 
        className="px-3 py-2 bg-muted/80 border border-border/50 rounded-full text-xs font-medium shadow-sm"
      >
        <div className="flex items-center gap-2">
          {data.status === 'completed' ? (
            <CheckCircle className="h-3 w-3 text-success" />
          ) : (
            <User className="h-3 w-3 text-muted-foreground" />
          )}
          <span className="truncate max-w-[140px]" title={data.title}>
            {data.title}
          </span>
        </div>
      </Badge>

      {/* Status indicator */}
      {data.status === 'completed' && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full border-2 border-background" />
      )}
    </div>
  );
});

SkillNode.displayName = 'SkillNode';