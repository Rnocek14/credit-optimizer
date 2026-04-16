import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { GraduationCap, ArrowRight, Sparkles, ChevronRight, TrendingUp, Zap, DollarSign } from 'lucide-react';
import type { RankedTemplate, GoalPreference } from '@/hooks/useQuickPlanGeneration';
import type { StrategyBadge } from '@/lib/planScoring';

interface ResultsStepProps {
  results: RankedTemplate[];
  onSelectTemplate: (templateId: string) => void;
  isApplying: boolean;
  /** Forwarded to /compare so the comparison surface inherits the same context. */
  goal?: GoalPreference;
  careerId?: string | null;
}

const badgeStyles: Record<StrategyBadge, string> = {
  'Best Overall': 'bg-primary/15 text-primary border-primary/30',
  'Cheapest':     'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'Fastest':      'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'Next Best':    'bg-muted text-muted-foreground border-border',
  'Third Best':   'bg-muted text-muted-foreground border-border',
};

const badgeIcons: Record<StrategyBadge, React.ComponentType<{ className?: string }>> = {
  'Best Overall': TrendingUp,
  'Cheapest':     DollarSign,
  'Fastest':      Zap,
  'Next Best':    Sparkles,
  'Third Best':   Sparkles,
};

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
          <span className="text-sm font-semibold tracking-wider uppercase">Your Top 3 Paths</span>
        </div>
        <h2 className="text-3xl font-bold tracking-tight">
          Three smart ways to your degree
        </h2>
        <p className="text-muted-foreground text-lg max-w-lg mx-auto">
          Ranked across cost, time, and transfer fit using verified data from 5 universities.
        </p>
      </div>

      <div className="grid gap-5 max-w-3xl mx-auto">
        {results.map((result, i) => {
          const t = result.template;
          const Icon = badgeIcons[result.badge];
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
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 space-y-3">
                  {/* Strategy badge + school */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={cn('text-xs gap-1.5 px-2.5 py-1', badgeStyles[result.badge])}
                    >
                      <Icon className="h-3 w-3" />
                      {result.badge}
                    </Badge>
                    <span className="text-xs font-medium text-muted-foreground">
                      {t.anchorSchool?.toUpperCase()} · {t.programId}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-semibold leading-tight">
                    {t.marketplace?.title || t.label}
                  </h3>

                  {/* Proof point — primary stat */}
                  <p className="text-2xl font-bold text-primary leading-none">
                    {result.proofPoint}
                  </p>

                  {/* Two supporting stats */}
                  <p className="text-sm text-muted-foreground">
                    {result.supportingStats[0]} · {result.supportingStats[1]}
                  </p>
                </div>

                <Button
                  onClick={() => onSelectTemplate(t.id)}
                  disabled={isApplying}
                  size={isFirst ? 'lg' : 'default'}
                  className={cn('gap-2 shrink-0', isFirst ? 'min-w-[160px]' : '')}
                >
                  Start This Plan
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Secondary actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <Button
          variant="outline"
          onClick={() => navigate('/compare')}
          className="gap-2"
        >
          Compare all 5 schools
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          onClick={() => navigate('/edu-tree-v5/marketplace')}
          className="text-muted-foreground gap-2"
        >
          See full marketplace
        </Button>
      </div>
    </div>
  );
}
