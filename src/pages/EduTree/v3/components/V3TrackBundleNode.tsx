import { Handle, Position } from '@xyflow/react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface TrackBundleNodeProps {
  data: {
    year: 1 | 2 | 3 | 4;
    trackId?: 'se' | 'ds';
    title: string;
    childCount: number;
    totalCredits: number;
    isExpanded?: boolean;
    onToggle?: () => void;
  };
}

export function V3TrackBundleNode({ data }: TrackBundleNodeProps) {
  const { title, childCount, totalCredits, isExpanded, trackId, onToggle } = data;
  
  const trackColor = trackId === 'se' 
    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
    : trackId === 'ds'
    ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20'
    : 'border-primary bg-card';

  return (
    <div 
      className={`rounded-lg border-2 ${trackColor} p-4 shadow-md cursor-pointer hover:shadow-lg transition-shadow`}
      onClick={onToggle}
      style={{ width: 'var(--v3-node-w)' }}
    >
      <Handle type="target" position={Position.Left} />
      
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 flex-shrink-0" />
            )}
            <div className="font-semibold text-sm truncate">
              {title}
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground space-y-0.5">
            <div>{childCount} courses</div>
            <div>{totalCredits} credits</div>
          </div>
        </div>
        
        {trackId && (
          <div className="text-[10px] font-bold px-2 py-0.5 rounded bg-background/80">
            {trackId.toUpperCase()}
          </div>
        )}
      </div>
      
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
