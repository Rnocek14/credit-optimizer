import { useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { usePlanStore } from '../state/usePlanStore';

interface MarketplaceOption {
  id: string;
  courseId: string;
  title: string;
  credits: number;
  provider: string;
  providerType?: string | null;
  cost_usd: number | null;
  duration_weeks: number | null;
}

interface MarketplacePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  moduleLabel: string;
  creditsEarned: number;
  creditsRequired: number;
  options: MarketplaceOption[];
  sortBy: 'cheapest' | 'shortest' | 'credits';
  setSortBy: (v: 'cheapest' | 'shortest' | 'credits') => void;
  yearEarned: number;
  yearCap: number;
}

export function MarketplacePanel({
  open,
  onOpenChange,
  moduleId,
  moduleLabel,
  creditsEarned,
  creditsRequired,
  options,
  sortBy,
  setSortBy,
  yearEarned,
  yearCap
}: MarketplacePanelProps) {
  const toggleCourse = usePlanStore(s => s.toggleCourse);
  const selected = usePlanStore(s => s.selections[moduleId]?.selected || []);

  const sortedOptions = useMemo(() => {
    const opts = [...options];
    if (sortBy === 'cheapest') {
      return opts.sort((a, b) => {
        if (a.cost_usd === null) return 1;
        if (b.cost_usd === null) return -1;
        return a.cost_usd - b.cost_usd;
      });
    } else if (sortBy === 'shortest') {
      return opts.sort((a, b) => {
        if (a.duration_weeks === null) return 1;
        if (b.duration_weeks === null) return -1;
        return a.duration_weeks - b.duration_weeks;
      });
    }
    return opts.sort((a, b) => b.credits - a.credits);
  }, [options, sortBy]);

  const isAtMax = creditsEarned >= creditsRequired;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[520px] sm:w-[600px] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center justify-between">
            <span>{moduleLabel}</span>
            <span className="text-sm text-muted-foreground">
              {creditsEarned}/{creditsRequired} cr
            </span>
          </SheetTitle>
          <div className="text-xs text-muted-foreground">
            Year progress: {yearEarned}/{yearCap} cr
          </div>
        </SheetHeader>

        {/* Sort dropdown */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-muted-foreground">Sort by</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="text-xs px-2 py-1 rounded border border-border bg-background"
          >
            <option value="cheapest">💰 Cheapest</option>
            <option value="shortest">⚡ Shortest</option>
            <option value="credits">📊 Most Credits</option>
          </select>
        </div>

        {/* Options list */}
        <div className="space-y-2">
          {sortedOptions.map(option => {
            const isSelected = selected.includes(option.courseId);
            const wouldExceedYearCap = !isSelected && yearEarned + option.credits > yearCap;
            const disabled = (isAtMax && !isSelected) || wouldExceedYearCap;

            return (
              <div
                key={option.id}
                className="border rounded-lg p-3 flex items-center justify-between hover:bg-accent/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">
                    {option.courseId}: {option.title}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                    <span>{option.credits} cr</span>
                    
                    {/* Provider badge */}
                    {option.providerType && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        option.providerType === 'university' ? 'bg-blue-100 text-blue-700' :
                        option.providerType === 'mooc' ? 'bg-purple-100 text-purple-700' :
                        option.providerType === 'bootcamp' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {option.providerType === 'university' && '🎓'}
                        {option.providerType === 'mooc' && '🌐'}
                        {option.providerType === 'bootcamp' && '⚡'}
                        {option.providerType === 'testing_center' && '📝'}
                        {' '}{option.provider}
                      </span>
                    )}
                    
                    {/* Price */}
                    {option.cost_usd !== null && (
                      <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700 text-[10px] font-medium">
                        {option.cost_usd === 0 ? 'Included' : `$${new Intl.NumberFormat().format(option.cost_usd)}`}
                      </span>
                    )}
                    
                    {/* Duration */}
                    {option.duration_weeks && <span>• {option.duration_weeks}w</span>}
                  </div>
                </div>
                
                <button
                  onClick={() => toggleCourse(moduleId, option.courseId, option.credits, creditsRequired)}
                  disabled={disabled}
                  className={`text-xs px-3 py-1.5 rounded transition-colors whitespace-nowrap ml-2 ${
                    isSelected
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : disabled
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : 'bg-primary/10 text-primary hover:bg-primary/20'
                  }`}
                  title={
                    wouldExceedYearCap ? `Year cap reached (${yearCap} cr)` :
                    isAtMax && !isSelected ? 'Module max reached' : ''
                  }
                >
                  {isSelected ? '✓ Selected' : disabled ? 'Cap Reached' : 'Select'}
                </button>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
