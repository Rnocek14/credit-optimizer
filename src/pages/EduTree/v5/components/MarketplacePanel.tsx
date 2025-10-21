import { useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePlanStore } from '../state/usePlanStore';
import { calculateOptionScore, type ScoreBreakdown, type ProviderType } from '../utils/optionScoring';
import { useScoringPrefs } from '../state/useScoringPrefs';

interface MarketplaceOption {
  id: string;
  courseId: string;
  title: string;
  credits: number;
  provider: string;
  providerType?: ProviderType;
  cost_usd: number | null;
  duration_weeks: number | null;
  score?: number;
  scoreBreakdown?: ScoreBreakdown;
  // CRI signals
  aceNccrs?: boolean;
  proctored?: boolean;
  providerRep?: number;
}

interface MarketplacePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  moduleLabel: string;
  creditsEarned: number;
  creditsRequired: number;
  options: MarketplaceOption[];
  sortBy: 'cheapest' | 'shortest' | 'credits' | 'best-match';
  setSortBy: (v: 'cheapest' | 'shortest' | 'credits' | 'best-match') => void;
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
  const liveEarned = usePlanStore(s => s.selections[moduleId]?.selectedCredits ?? 0);
  
  const { weights, setWeights, resetWeights } = useScoringPrefs();
  const [showWeights, setShowWeights] = useState(false);

  // Enrich options with scores
  const enriched = useMemo(() => {
    return options.map(o => {
      const breakdown = calculateOptionScore(o, options, weights);
      return { ...o, score: breakdown.total, scoreBreakdown: breakdown };
    });
  }, [options, weights]);

  // Sort enriched options
  const sortedOptions = useMemo(() => {
    const opts = [...enriched];
    
    if (sortBy === 'best-match') {
      return opts.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    }
    if (sortBy === 'cheapest') {
      return opts.sort((a, b) => {
        if (a.cost_usd === null) return 1;
        if (b.cost_usd === null) return -1;
        return a.cost_usd - b.cost_usd;
      });
    }
    if (sortBy === 'shortest') {
      return opts.sort((a, b) => {
        if (a.duration_weeks === null) return 1;
        if (b.duration_weeks === null) return -1;
        return a.duration_weeks - b.duration_weeks;
      });
    }
    // credits
    return opts.sort((a, b) => (b.credits ?? 0) - (a.credits ?? 0));
  }, [enriched, sortBy]);

  const isAtMax = creditsEarned >= creditsRequired;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[520px] sm:w-[600px] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center justify-between">
            <span>{moduleLabel}</span>
            <span className="text-sm text-muted-foreground">
              {liveEarned}/{creditsRequired} cr
            </span>
          </SheetTitle>
          <div className="text-xs text-muted-foreground">
            Year progress: {yearEarned}/{yearCap} cr
          </div>
        </SheetHeader>

        {/* Sort dropdown & Weight Tuner */}
        <div className="mb-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sort by</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="text-xs px-2 py-1 rounded border border-border bg-background"
            >
              <option value="best-match">🎯 Best Match</option>
              <option value="cheapest">💰 Cheapest</option>
              <option value="shortest">⚡ Shortest</option>
              <option value="credits">📊 Most Credits</option>
            </select>
            
            <button
              className="text-xs px-2 py-1 rounded bg-accent hover:bg-accent/80 transition-colors ml-auto"
              onClick={() => setShowWeights(v => !v)}
            >
              ⚙️ Priorities
            </button>
          </div>

          {showWeights && (
            <div className="p-3 bg-accent/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-medium">Adjust what matters to you:</div>
                <button
                  onClick={resetWeights}
                  className="text-[10px] text-muted-foreground hover:text-foreground underline"
                >
                  Reset to default
                </button>
              </div>
              <div className="space-y-2">
                {(['cost', 'time', 'quality'] as const).map(key => (
                  <label key={key} className="flex items-center gap-2">
                    <span className="text-xs w-20 capitalize">
                      {key === 'cost' && '💰'} {key === 'time' && '⚡'} {key === 'quality' && '⭐'} {key}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(weights[key] * 100)}
                      onChange={(e) => setWeights({ [key]: (+e.target.value) / 100 })}
                      className="flex-1"
                    />
                    <span className="text-xs w-10 text-right font-medium">{Math.round(weights[key] * 100)}%</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Options list */}
        <div className="space-y-2">
          {sortedOptions.map(option => {
            const isSelected = selected.includes(option.courseId);
            const optionCredits = Number(option.credits) || 0;
            const wouldExceedYearCap = !isSelected && yearEarned + optionCredits > yearCap;
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
                    
                    {/* CRI Badge */}
                    {option.scoreBreakdown && (
                      <span 
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          option.scoreBreakdown.cri >= 80 ? 'bg-green-100 text-green-700' :
                          option.scoreBreakdown.cri >= 60 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}
                        title="Credit Recognition Index – likelihood to transfer"
                      >
                        🛡️ CRI {option.scoreBreakdown.cri}
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
                    
                    {/* Why This? Popover */}
                    {option.scoreBreakdown && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button 
                            className="text-[11px] underline text-muted-foreground hover:text-foreground"
                            aria-label={`View match breakdown for ${option.title}`}
                          >
                            Why this?
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-3" align="start">
                          <div className="space-y-2">
                            <div className="text-sm font-semibold">
                              Match Score: {option.score}/100
                            </div>
                            
                            <div className="space-y-1.5 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">💰 Cost</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-green-500"
                                      style={{ width: `${option.scoreBreakdown.cost}%` }}
                                    />
                                  </div>
                                  <span className="font-medium w-12 text-right">{option.scoreBreakdown.cost}/100</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">⚡ Speed</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-blue-500"
                                      style={{ width: `${option.scoreBreakdown.time}%` }}
                                    />
                                  </div>
                                  <span className="font-medium w-12 text-right">{option.scoreBreakdown.time}/100</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">⭐ Quality</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-purple-500"
                                      style={{ width: `${option.scoreBreakdown.quality}%` }}
                                    />
                                  </div>
                                  <span className="font-medium w-12 text-right">{option.scoreBreakdown.quality}/100</span>
                                </div>
                              </div>
                              
                              <div className="pt-2 border-t mt-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">🛡️ Credit Recognition (CRI)</span>
                                  <span className={`font-semibold ${
                                    option.scoreBreakdown.cri >= 80 ? 'text-green-600' :
                                    option.scoreBreakdown.cri >= 60 ? 'text-yellow-600' :
                                    'text-red-600'
                                  }`}>
                                    {option.scoreBreakdown.cri}/100
                                  </span>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  Estimated likelihood this option transfers for degree credit at most schools. Based on provider type, ACE/NCCRS status, and assessment rigor.
                                </p>
                                
                                {option.scoreBreakdown.cri < 50 && (
                                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-[10px] text-yellow-800">
                                    ⚠️ <strong>Transfer risk:</strong> Low likelihood of transfer. Check your school's transfer policy before enrolling.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={() => toggleCourse(moduleId, option.courseId, optionCredits, creditsRequired)}
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
