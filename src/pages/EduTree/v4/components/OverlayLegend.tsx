/**
 * OverlayLegend - Visual guide for overlay elements
 */
import { Info } from 'lucide-react';

interface OverlayLegendProps {
  visible: boolean;
}

export function OverlayLegend({ visible }: OverlayLegendProps) {
  if (!visible) return null;
  
  return (
    <div className="fixed top-24 left-4 bg-card border border-border rounded-lg shadow-lg p-3 w-64 z-20">
      <div className="flex items-center gap-2 mb-2">
        <Info className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold text-xs text-foreground">Legend</h3>
      </div>
      
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 border-t-2 border-dashed border-purple-500" />
          <span className="text-muted-foreground">Plan B Alternative</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 border-t-2 border-dashed border-yellow-500" />
          <span className="text-muted-foreground">Transfer Credit</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-600" />
          <span className="text-muted-foreground">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded border-2 border-dashed border-purple-500 bg-purple-500/10" />
          <span className="text-muted-foreground">Alternative Course</span>
        </div>
      </div>
    </div>
  );
}
