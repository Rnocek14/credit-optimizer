/**
 * Phase 3: Checkpoint Node Component
 * 
 * Renders at fork points where alternatives exist
 * Shows alternative count and opens drawer on click
 * 
 * Visual design: Distinct from track-bundle (diamond shape, different colors)
 */

import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { GitBranch } from 'lucide-react';

type CheckpointNodeData = {
  title?: string;
  alternativeCount?: number;
  sourceNodeId?: string;
  onCheckpointClick?: (checkpointId: string, sourceNodeId: string) => void;
};

type CheckpointNode = Node<CheckpointNodeData, 'checkpoint'>;

export const V3CheckpointNode = memo(({ id, data }: NodeProps<CheckpointNode>) => {
  const {
    title = 'Choose Your Path',
    alternativeCount = 0,
    sourceNodeId = '',
    onCheckpointClick,
  } = data ?? {};

  const handleClick = () => {
    console.log(`[Checkpoint] Clicked: ${id}, alternatives: ${alternativeCount}, sourceNodeId: ${sourceNodeId}`);
    if (!sourceNodeId) return;
    onCheckpointClick?.(String(id), sourceNodeId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
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

      {/* Phase 3B: Checkpoint card with accessibility */}
      <div
        data-testid="checkpoint"
        data-node-type="checkpoint"
        className="relative flex flex-col items-center justify-center gap-2 px-6 py-4 
                   bg-gradient-to-br from-warning/20 to-warning/10 
                   border-2 border-warning rounded-lg
                   shadow-lg hover:shadow-xl transition-all duration-200
                   cursor-pointer group
                   overflow-hidden focus:outline-none focus:ring-2 focus:ring-warning"
        style={{ width: '232px', minHeight: '120px' }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-label={`${title}: ${alternativeCount} alternative${alternativeCount !== 1 ? 's' : ''} available`}
      >
        {/* Icon */}
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-warning/20">
          <GitBranch className="w-5 h-5 text-warning" />
        </div>

        {/* Title */}
        <div className="text-center">
          <div className="text-sm font-semibold text-foreground">
            {title}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {alternativeCount} alternative{alternativeCount !== 1 ? 's' : ''} available
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
