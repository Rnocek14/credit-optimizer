import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';

export interface V3RequirementNodeData {
  title?: string;
  year?: number;
  programId?: string;
  trackId?: 'se' | 'ds';
  credits_needed?: number;
  area?: string;
  [key: string]: any;
}

interface V3RequirementNodeProps {
  data: V3RequirementNodeData;
  selected?: boolean;
}

export default function V3RequirementNode({ data, selected }: V3RequirementNodeProps) {
  const trackColor = 
    data.trackId === 'se' ? 'border-blue-500' :
    data.trackId === 'ds' ? 'border-purple-500' :
    'border-border';

  return (
    <div className="min-w-[180px]">
      <Handle type="target" position={Position.Left} id="in" />
      
      <Card className={`p-3 ${trackColor} ${selected ? 'ring-2 ring-primary' : ''}`}>
        <div className="space-y-1">
          <div className="font-semibold text-sm">{data.title || 'Requirement'}</div>
          
          {data.credits_needed && (
            <div className="text-xs text-muted-foreground">
              {data.credits_needed} credits
            </div>
          )}
          
          {data.trackId && (
            <div className={`text-xs font-medium ${
              data.trackId === 'se' ? 'text-blue-600' : 'text-purple-600'
            }`}>
              {data.trackId.toUpperCase()} Track
            </div>
          )}
        </div>
      </Card>
      
      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}
