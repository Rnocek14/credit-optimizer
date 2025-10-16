/**
 * V4 Debug HUD - Floating development panel
 * Only renders in development mode
 */

import { Button } from '@/components/ui/button';
import { V4DebugState } from '../types/v4';

interface V4DevHUDProps {
  debugState: V4DebugState & {
    exportSnapshot: () => void;
    validateGraph: () => { valid: boolean; errors: string[] };
  };
}

export function V4DevHUD({ debugState }: V4DevHUDProps) {
  if (import.meta.env.PROD) return null;

  const { exportSnapshot, validateGraph, ...state } = debugState;
  const validation = validateGraph();

  return (
    <div className="fixed top-4 right-4 z-50 bg-background/95 border rounded-lg p-4 shadow-lg max-w-sm">
      <div className="text-xs font-mono space-y-2">
        <div className="font-bold text-primary">V4 Debug HUD</div>
        
        <div>
          <span className="text-muted-foreground">Nodes:</span>{' '}
          <span className="text-foreground">{state.visibleNodes.length}</span>
        </div>
        
        <div>
          <span className="text-muted-foreground">Overlay:</span>{' '}
          <span className="text-foreground">{state.activeOverlay || 'none'}</span>
        </div>
        
        <div>
          <span className="text-muted-foreground">Layout Hash:</span>{' '}
          <span className="text-foreground truncate block">
            {state.layoutHash.slice(0, 20)}...
          </span>
        </div>
        
        {state.lastFitView && (
          <div>
            <span className="text-muted-foreground">Last fitView:</span>{' '}
            <span className="text-foreground">
              {new Date(state.lastFitView).toLocaleTimeString()}
            </span>
          </div>
        )}
        
        <div>
          <span className="text-muted-foreground">Valid:</span>{' '}
          <span className={validation.valid ? 'text-green-500' : 'text-red-500'}>
            {validation.valid ? '✓' : `✗ (${validation.errors.length} errors)`}
          </span>
        </div>
        
        <Button 
          size="sm" 
          variant="outline" 
          onClick={exportSnapshot}
          className="w-full mt-2"
        >
          Export Snapshot
        </Button>
      </div>
    </div>
  );
}
