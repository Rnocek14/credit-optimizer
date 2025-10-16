/**
 * TransferSummaryPanel - Shows transfer credit usage and residency status
 */
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface TransferSummaryPanelProps {
  visible: boolean;
  transferCredits: {
    used: number;
    cap: number;
    sources: { 
      CLEP: number; 
      AP: number; 
      ACE: number 
    };
  };
  residency: {
    required: number;
    met: number;
  };
}

export function TransferSummaryPanel({ 
  visible, 
  transferCredits, 
  residency 
}: TransferSummaryPanelProps) {
  if (!visible) return null;
  
  const percentage = (transferCredits.used / transferCredits.cap) * 100;
  
  return (
    <div className="fixed bottom-6 right-6 bg-card border border-border rounded-lg shadow-lg p-4 w-64 z-20">
      <h3 className="font-semibold text-sm mb-3 text-amber-900 dark:text-amber-100">
        Transfer Credit Summary
      </h3>
      
      {/* Progress meter */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1 text-foreground">
          <span>Used: {transferCredits.used} / {transferCredits.cap}</span>
          <span>{percentage.toFixed(0)}%</span>
        </div>
        <Progress value={percentage} className="h-2" />
      </div>
      
      {/* Source breakdown */}
      <div className="space-y-1 text-xs mb-3">
        <div className="flex justify-between">
          <span className="text-muted-foreground">CLEP:</span>
          <span className="font-medium text-foreground">{transferCredits.sources.CLEP} cr</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">AP:</span>
          <span className="font-medium text-foreground">{transferCredits.sources.AP} cr</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">ACE:</span>
          <span className="font-medium text-foreground">{transferCredits.sources.ACE} cr</span>
        </div>
      </div>
      
      {/* Residency requirement */}
      <div className="pt-3 border-t border-border">
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground">Residency Required:</span>
          <Badge 
            variant={residency.met >= residency.required ? "default" : "secondary"}
            size="sm"
          >
            {residency.met} / {residency.required}
          </Badge>
        </div>
      </div>
    </div>
  );
}
