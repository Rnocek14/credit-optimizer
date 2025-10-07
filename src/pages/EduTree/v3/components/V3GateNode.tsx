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
  const gateLabel = data?.title ?? (data?.year === 2 ? 'Program Gate' : 'Track Gate');
  const showCompare = data?.showCompare && data?.se && data?.ds;
  
  return (
    <div className="w-[var(--v3-node-w)] min-w-[var(--v3-node-w)] max-w-[var(--v3-node-w)] box-border relative">
      {/* Gate handles (vertical connections) */}
      <Handle id="north" type="target" position={Position.Top} />
      <Handle id="south" type="source" position={Position.Bottom} />
      
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
      
      <div className="absolute left-1/2 -translate-x-1/2 mt-1 text-[10px] text-muted-foreground select-none pointer-events-none whitespace-nowrap">
        {gateLabel}
      </div>
    </div>
  );
}
