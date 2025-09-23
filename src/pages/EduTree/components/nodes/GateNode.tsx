import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { V2NodeData } from '../../utils/manualLayoutRenderer';

interface GateNodeProps {
  data: V2NodeData;
}

export const GateNode = memo(({ data }: GateNodeProps) => {
  const title = data.junctionType === "program" ? "Program Gate" : "Track Gate";
  const subtitle = data.junctionType === "program" ? "Choose Program" : "Choose Track";

  return (
    <div className="gate-node w-[280px] h-[72px] rounded-[14px] px-[14px] py-[12px] outline outline-2 outline-dashed outline-border bg-background/85 flex flex-col justify-center transform-gpu">
      <Handle type="source" position={Position.Right} id="out" className="w-3 h-3" />
      <Handle type="source" position={Position.Top} id="out-se" className="w-3 h-3" />
      <Handle type="source" position={Position.Bottom} id="out-ds" className="w-3 h-3" />
      
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground leading-none mb-1">
        {title}
      </div>
      <div className="text-sm font-medium leading-tight text-foreground">
        {subtitle}
      </div>
    </div>
  );
});

GateNode.displayName = 'GateNode';