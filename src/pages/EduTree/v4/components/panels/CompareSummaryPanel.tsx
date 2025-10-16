/**
 * CompareSummaryPanel - Shows side-by-side comparison of Plan A vs Plan B
 */
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeftRight } from 'lucide-react';

interface CompareSummaryPanelProps {
  visible: boolean;
  planA: {
    name: string;
    totalCost: number;
    completionTime: string;
    transferCredits: number;
  };
  planB: {
    name: string;
    totalCost: number;
    completionTime: string;
    transferCredits: number;
  };
  onSwitchToPlanB?: () => void;
}

export function CompareSummaryPanel({ 
  visible, 
  planA, 
  planB,
  onSwitchToPlanB 
}: CompareSummaryPanelProps) {
  if (!visible) return null;
  
  const costDiff = planB.totalCost - planA.totalCost;
  const transferDiff = planB.transferCredits - planA.transferCredits;
  
  return (
    <div className="fixed bottom-6 right-6 bg-card border border-border rounded-lg shadow-lg p-4 w-80 z-20">
      <div className="flex items-center gap-2 mb-3">
        <ArrowLeftRight className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        <h3 className="font-semibold text-sm text-purple-900 dark:text-purple-100">
          Plan Comparison
        </h3>
      </div>
      
      {/* Header Row */}
      <div className="grid grid-cols-3 gap-2 mb-2 text-xs font-semibold">
        <div className="text-muted-foreground">Metric</div>
        <div className="text-center text-blue-700 dark:text-blue-300">{planA.name}</div>
        <div className="text-center text-purple-700 dark:text-purple-300">{planB.name}</div>
      </div>
      
      {/* Comparison Rows */}
      <div className="space-y-2 text-xs mb-4">
        {/* Total Cost */}
        <div className="grid grid-cols-3 gap-2 items-center">
          <span className="text-muted-foreground">Total Cost</span>
          <div className="text-center font-medium text-foreground">
            ${planA.totalCost.toLocaleString()}
          </div>
          <div className="text-center font-medium text-foreground">
            ${planB.totalCost.toLocaleString()}
          </div>
        </div>
        
        {/* Completion Time */}
        <div className="grid grid-cols-3 gap-2 items-center">
          <span className="text-muted-foreground">Time</span>
          <div className="text-center font-medium text-foreground">{planA.completionTime}</div>
          <div className="text-center font-medium text-foreground">{planB.completionTime}</div>
        </div>
        
        {/* Transfer Credits */}
        <div className="grid grid-cols-3 gap-2 items-center">
          <span className="text-muted-foreground">Transfer</span>
          <div className="text-center font-medium text-foreground">{planA.transferCredits} cr</div>
          <div className="text-center font-medium text-foreground">{planB.transferCredits} cr</div>
        </div>
      </div>
      
      {/* Savings Badge */}
      {costDiff < 0 && (
        <div className="mb-3 p-2 bg-green-500/10 border border-green-500/30 rounded text-xs text-center">
          <span className="font-semibold text-green-700 dark:text-green-300">
            Plan B saves ${Math.abs(costDiff).toLocaleString()}
          </span>
        </div>
      )}
      
      {/* Switch Button */}
      <Button 
        size="sm" 
        className="w-full" 
        variant="outline"
        onClick={onSwitchToPlanB}
      >
        <ArrowLeftRight className="h-3 w-3 mr-2" />
        Switch to {planB.name}
      </Button>
    </div>
  );
}
