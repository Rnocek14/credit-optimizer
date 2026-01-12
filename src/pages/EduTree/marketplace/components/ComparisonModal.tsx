import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { MarketplaceDegreeTemplate } from '@/pages/EduTree/v5/types/templates';
import { useNavigate } from 'react-router-dom';
import { Check, DollarSign, Clock, TrendingUp, Laptop, Sparkles, ArrowDown } from 'lucide-react';
import { calculateStrategySavings, formatSavingsAmount, MIN_SAVINGS_TO_SHOW_BANNER } from '@/lib/templateSavingsCalculator';

interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: MarketplaceDegreeTemplate[];
}

function formatCurrency(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return `$${amount.toLocaleString()}`;
}

export function ComparisonModal({ isOpen, onClose, templates }: ComparisonModalProps) {
  const navigate = useNavigate();

  // Calculate comparison metrics
  const { cheapest, fastest, maxSavings, maxTimeSaved } = useMemo(() => {
    if (templates.length === 0) return { cheapest: null, fastest: null, maxSavings: 0, maxTimeSaved: 0 };
    
    const cheap = templates.reduce((min, t) => t.totals.costUsd < min.totals.costUsd ? t : min);
    const fast = templates.reduce((min, t) => t.totals.weeks < min.totals.weeks ? t : min);
    const maxCost = Math.max(...templates.map(t => t.totals.costUsd));
    const maxWeeks = Math.max(...templates.map(t => t.totals.weeks));
    
    return {
      cheapest: cheap,
      fastest: fast,
      maxSavings: maxCost - cheap.totals.costUsd,
      maxTimeSaved: maxWeeks - fast.totals.weeks,
    };
  }, [templates]);

  if (templates.length === 0 || !cheapest || !fastest) return null;

  const handleSelect = (templateId: string) => {
    navigate(`/edu-tree-v5?templateId=${templateId}`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compare Degree Paths</DialogTitle>
          <DialogDescription>
            Side-by-side comparison to help you choose the best path
          </DialogDescription>
        </DialogHeader>

        {/* Savings Summary Banner */}
        {(maxSavings > 0 || maxTimeSaved > 4) && (
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Comparison Summary</span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              {maxSavings > 0 && (
                <div>
                  <span className="text-muted-foreground">Cheapest: </span>
                  <span className="font-medium">{cheapest.anchorSchool}</span>
                  <span className="text-muted-foreground"> — saves </span>
                  <span className="text-primary font-semibold">{formatCurrency(maxSavings)}</span>
                </div>
              )}
              {maxTimeSaved > 4 && cheapest.id !== fastest.id && (
                <div className="pl-4 border-l border-border">
                  <span className="text-muted-foreground">Fastest: </span>
                  <span className="font-medium">{fastest.anchorSchool}</span>
                  <span className="text-muted-foreground"> — </span>
                  <span className="font-semibold">{Math.round(maxTimeSaved / 4.33)}mo faster</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${templates.length}, 1fr)` }}>
          {templates.map(template => {
            const isCheapest = template.id === cheapest.id;
            const isFastest = template.id === fastest.id;
            const timeMonths = Math.round(template.totals.weeks / 4.33);
            const roiYears = (template.totals.costUsd / 60000).toFixed(1);
            
            // Calculate how much more expensive this option is
            const costDiff = template.totals.costUsd - cheapest.totals.costUsd;
            const weeksDiff = template.totals.weeks - fastest.totals.weeks;

            // Calculate strategy savings if baseline exists
            const strategySavings = calculateStrategySavings(template);

            return (
              <div key={template.id} className="border rounded-lg p-4 space-y-4">
                {/* Header */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-semibold text-sm leading-tight">
                      {template.marketplace.title}
                    </h4>
                    {template.marketplace.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {template.marketplace.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {template.anchorSchool}
                  </p>
                </div>

                {/* Strategy Savings Banner */}
                {strategySavings && strategySavings.dollarSavings >= MIN_SAVINGS_TO_SHOW_BANNER && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-md p-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <ArrowDown className="h-3 w-3 text-emerald-600" />
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                        Multi-School Savings
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground line-through">
                        Full {strategySavings.anchorSchool}: {formatSavingsAmount(strategySavings.baselineCost)}
                      </span>
                      <span className="font-medium text-emerald-600">
                        Save {formatSavingsAmount(strategySavings.dollarSavings)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Cost */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <DollarSign className="h-3 w-3" />
                    <span>Total Cost</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">
                      ${(template.totals.costUsd / 1000).toFixed(1)}K
                    </span>
                    {isCheapest ? (
                      <Badge variant="default" className="text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        Cheapest
                      </Badge>
                    ) : costDiff > 0 && (
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                        +{formatCurrency(costDiff)}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Time */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Duration</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{timeMonths}mo</span>
                    {isFastest ? (
                      <Badge variant="secondary" className="text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        Fastest
                      </Badge>
                    ) : weeksDiff > 4 && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        +{Math.round(weeksDiff / 4.33)}mo
                      </Badge>
                    )}
                  </div>
                </div>

                {/* ROI */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    <span>ROI</span>
                  </div>
                  <span className="text-sm">Break even in ~{roiYears} years</span>
                </div>

                {/* Lifestyle */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Weekly Commitment</span>
                  </div>
                  <div className="text-sm">
                    {template.lifestyle.avgWeeklyHours} hrs/week
                    <div className="text-xs text-muted-foreground capitalize">
                      {template.lifestyle.paceType}
                    </div>
                  </div>
                </div>

                {/* Delivery */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Laptop className="h-3 w-3" />
                    <span>Delivery</span>
                  </div>
                  <div className="text-sm">
                    {template.deliveryMode === 'fully_online' && '100% Online'}
                    {template.deliveryMode === 'hybrid' && `Hybrid (${template.inPersonWeeks}w on-campus)`}
                    {template.deliveryMode === 'in_person_required' && 'In-Person Required'}
                  </div>
                </div>

                {/* Provenance */}
                <div className="pt-2 border-t text-xs text-muted-foreground">
                  {template.catalogYear} Catalog
                  <div>Last verified: {new Date(template.lastVerified).toLocaleDateString()}</div>
                </div>

                {/* Select Button */}
                <Button 
                  onClick={() => handleSelect(template.id)}
                  className="w-full"
                  size="sm"
                >
                  Select This Path
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
