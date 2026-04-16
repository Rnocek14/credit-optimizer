import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { GraduationCap, DollarSign, Clock, ArrowRight, Sparkles, ChevronRight } from 'lucide-react';
import type { RankedTemplate } from '@/hooks/useQuickPlanGeneration';

interface ResultsStepProps {
  results: RankedTemplate[];
  onSelectTemplate: (templateId: string) => void;
  isApplying: boolean;
}

const badgeColors: Record<string, string> = {
  'Recommended': 'bg-primary/15 text-primary border-primary/30',
  'Best Value': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'Fastest': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'Most Flexible': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
};

function formatCost(cost: number): string {
  if (cost >= 1000) return `$${(cost / 1000).toFixed(1)}k`;
  return `$${cost.toLocaleString()}`;
}

export function ResultsStep({ results, onSelectTemplate, isApplying }: ResultsStepProps) {
  const navigate = useNavigate();

  if (results.length === 0) {
    return (
      <div className="text-center py-16 space-y-4 animate-fade-in-up">
        <GraduationCap className="h-16 w-16 text-muted-foreground mx-auto" />
        <h2 className="text-2xl font-bold">No matching plans found</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Try browsing all available degree paths in our marketplace.
        </p>
        <Button onClick={() => navigate('/edu-tree-v5/marketplace')} className="gap-2">
          Browse All Plans <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 text-primary">
          <Sparkles className="h-5 w-5" />
          <span className="text-sm font-semibold tracking-wider uppercase">Your Top Matches</span>
        </div>
        <h2 className="text-3xl font-bold tracking-tight">
          Here's your fastest path to a degree
        </h2>
        <p className="text-muted-foreground text-lg max-w-lg mx-auto">
          We analyzed transfer credits, alt-credit options, and real university requirements.
        </p>
      </div>

      <div className="grid gap-5 max-w-3xl mx-auto">
        {results.map((result, i) => {
          const t = result.template;
          const isFirst = i === 0;
          return (
            <div
              key={t.id}
              className={cn(
                'relative rounded-xl border-2 bg-card p-6 transition-all',
                isFirst
                  ? 'border-primary/50 shadow-lg shadow-primary/5'
                  : 'border-border/50 hover:border-border'
              )}
            >
              {isFirst && (
                <div className="absolute -top-3 left-6">
                  <Badge className="bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold">
                    Top Pick
                  </Badge>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Info */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={cn('text-xs', badgeColors[result.badge])}
                    >
                      {result.badge}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {t.anchorSchool?.toUpperCase()}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold leading-tight">
                    {t.marketplace?.title || `${t.title}`}
                  </h3>

                  {/* Stats row */}
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <DollarSign className="h-4 w-4" />
                      {formatCost(result.estimatedCost)}
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <Clock className="h-4 w-4" />
                      {result.estimatedYears} yrs
                    </span>
                    {result.transferPercent > 0 && (
                      <span className="flex items-center gap-1.5 text-cyan-400">
                        <GraduationCap className="h-4 w-4" />
                        {result.transferPercent}% transfer
                      </span>
                    )}
                  </div>
                </div>

                {/* CTA */}
                <Button
                  onClick={() => onSelectTemplate(t.id)}
                  disabled={isApplying}
                  size={isFirst ? 'lg' : 'default'}
                  className={cn(
                    'gap-2 shrink-0',
                    isFirst ? 'min-w-[160px]' : ''
                  )}
                >
                  Start This Plan
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Secondary action */}
      <div className="text-center pt-2">
        <Button
          variant="ghost"
          onClick={() => navigate('/edu-tree-v5/marketplace')}
          className="text-muted-foreground gap-2"
        >
          See all options
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
