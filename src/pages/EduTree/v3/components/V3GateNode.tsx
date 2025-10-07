import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Split } from 'lucide-react';

export interface V3GateNodeData {
  title?: string;
  year?: number;
  junctionType?: 'program' | 'track';
  [key: string]: any;
}

interface V3GateNodeProps {
  data: V3GateNodeData;
  selected?: boolean;
}

export default function V3GateNode({ data, selected }: V3GateNodeProps) {
  const gateType = data.junctionType || (data.title?.includes('Program') ? 'program' : 'track');
  
  return (
    <div className="w-[var(--v3-node-w)] min-w-[var(--v3-node-w)] max-w-[var(--v3-node-w)] box-border">
      <Handle type="target" position={Position.Left} id="in" />
      
      <Card className={`p-4 bg-primary/5 border-primary/30 ${selected ? 'ring-2 ring-primary' : ''} w-full overflow-hidden h-[var(--v3-gate-h)]`}>
        <div className="flex flex-col items-center gap-2">
          <Split className="w-6 h-6 text-primary" />
          <div className="font-semibold text-sm text-center whitespace-nowrap overflow-hidden text-ellipsis">
            {data.title || 'Gate'}
          </div>
          <div className="text-xs text-muted-foreground capitalize">
            {gateType} Decision
          </div>
        </div>
      </Card>
      
      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}
