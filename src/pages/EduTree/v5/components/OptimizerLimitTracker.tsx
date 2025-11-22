import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface LimitStatus {
  label: string;
  current: number;
  limit: number;
  isMax: boolean; // true for "max" limits, false for "min" limits
}

interface OptimizerLimitTrackerProps {
  limits: LimitStatus[];
  title?: string;
}

export function OptimizerLimitTracker({ limits, title = 'Optimizer Limit Tracking' }: OptimizerLimitTrackerProps) {
  return (
    <Card className="p-4 space-y-3 bg-muted/30">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">{title}</h4>
        <Badge variant="outline" className="text-xs">
          Real-time
        </Badge>
      </div>

      <div className="space-y-3">
        {limits.map((limit, idx) => {
          const percentage = (limit.current / limit.limit) * 100;
          const isViolated = limit.isMax 
            ? limit.current > limit.limit 
            : limit.current < limit.limit;
          const isWarning = limit.isMax
            ? percentage > 90
            : percentage < 80;

          return (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium flex items-center gap-1.5">
                  {!isViolated ? (
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                  ) : (
                    <AlertCircle className="h-3 w-3 text-destructive" />
                  )}
                  {limit.label}
                </span>
                <span className={`text-muted-foreground ${isViolated ? 'text-destructive font-semibold' : ''}`}>
                  {limit.current}/{limit.limit} {limit.isMax ? 'max' : 'min'}
                </span>
              </div>
              <Progress
                value={Math.min(percentage, 100)}
                className={`h-1.5 ${
                  isViolated
                    ? 'bg-destructive/20'
                    : isWarning
                    ? 'bg-orange-600/20'
                    : 'bg-secondary'
                }`}
              />
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-600 rounded-full" />
            <span>OK</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-orange-600 rounded-full" />
            <span>Warning</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-destructive rounded-full" />
            <span>Exceeded</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

// Example usage in CreditOptimizerDevTools:
// <OptimizerLimitTracker
//   limits={[
//     { label: 'CLEP Credits', current: 37, limit: 40, isMax: true },
//     { label: 'DSST Credits', current: 24, limit: 30, isMax: true },
//     { label: 'Sophia Credits', current: 45, limit: 90, isMax: true },
//     { label: 'TESU Residency', current: 18, limit: 15, isMax: false },
//     { label: 'Upper Division', current: 33, limit: 30, isMax: false },
//   ]}
// />
