/**
 * Phase 3: Checkpoint Node Component
 * 
 * Renders at fork points where alternatives exist
 * Shows alternative count and opens drawer on click
 * 
 * Visual design: Distinct from track-bundle (diamond shape, different colors)
 */

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { GitBranch } from 'lucide-react';

export const V3CheckpointNode = memo(({ data, id }: NodeProps) => {
  const altCount = (data as any).alternativeCount ?? 0;
  const sourceNodeId = (data as any).sourceNodeId ?? '';
  const onCheckpointClick = (data as any).onCheckpointClick;

  const handleClick = () => {
    console.log(`[Checkpoint] Clicked: ${id}, alternatives: ${altCount}, sourceNodeId: ${sourceNodeId}`);
    if (onCheckpointClick && sourceNodeId) {
      onCheckpointClick(String(id), String(sourceNodeId));
    }
  };

  return (
    <div className="relative">
      {/* Top handle */}
      <Handle
        type="target"
        position={Position.Top}
        id="north"
        className="w-3 h-3 !bg-primary"
      />

      {/* FIX #3: Checkpoint card with overflow-hidden */}
      <div
        data-testid="checkpoint"
        className="relative flex flex-col items-center justify-center gap-2 px-6 py-4 
                   bg-gradient-to-br from-warning/20 to-warning/10 
                   border-2 border-warning rounded-lg
                   shadow-lg hover:shadow-xl transition-all duration-200
                   cursor-pointer group
                   overflow-hidden"
        style={{ width: '232px', minHeight: '120px' }}
        onClick={handleClick}
      >
        {/* Icon */}
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-warning/20">
          <GitBranch className="w-5 h-5 text-warning" />
        </div>

        {/* Title */}
        <div className="text-center">
          <div className="text-sm font-semibold text-foreground">
            {(data as any).title || 'Choose Your Path'}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {altCount} alternative{altCount !== 1 ? 's' : ''} available
          </div>
        </div>

        {/* Hover hint */}
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 
                        opacity-0 group-hover:opacity-100 transition-opacity
                        text-xs text-muted-foreground whitespace-nowrap">
          Click to view options
        </div>
      </div>

      {/* Bottom handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="south"
        className="w-3 h-3 !bg-primary"
      />
    </div>
  );
});

V3CheckpointNode.displayName = 'V3CheckpointNode';
