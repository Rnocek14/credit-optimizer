import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { CourseCard } from './CourseCard';
import { ModuleData } from '../types/v5';
import { usePlanStore } from '../state/usePlanStore';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

interface ModuleCardProps extends ModuleData {
  onToggle: () => void;
  onCourseClick?: (courseId: string) => void;
  cheapestOption?: number | null;
  onOpenPanel?: () => void;
  yearEarned?: number;
  yearCap?: number;
}

export function ModuleCard({ 
  id,
  label, 
  icon, 
  description, 
  courses, 
  creditsEarned, 
  creditsRequired,
  isCollapsed,
  onToggle,
  onCourseClick,
  optionsCount,
  marketplaceOptions,
  cheapestOption,
  onOpenPanel,
  yearEarned = 0,
  yearCap = 30
}: ModuleCardProps) {
  const progress = creditsRequired > 0 ? (creditsEarned / creditsRequired) * 100 : 0;
  const selections = usePlanStore(s => s.selections);
  const toggleCourse = usePlanStore(s => s.toggleCourse);
  const selectedIds = selections[id]?.selected ?? [];
  
  const [sortBy, setSortBy] = useState<'cheapest' | 'shortest' | 'credits'>('cheapest');

  const sortedOptions = useMemo(() => {
    if (!marketplaceOptions) return [];
    
    const opts = [...marketplaceOptions];
    
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
    // Most credits
    return opts.sort((a, b) => b.credits - a.credits);
  }, [marketplaceOptions, sortBy]);
  
  return (
    <div
      className="module-card bg-card border-2 border-border rounded-lg overflow-hidden"
    >
      {/* Module Header - Clickable */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        role="button"
        aria-expanded={!isCollapsed}
        aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${label} module`}
        className="module-header p-3 cursor-pointer hover:bg-accent/50 transition-colors flex items-center gap-3"
      >
        {/* Icon */}
        <div className="text-2xl flex-shrink-0">{icon}</div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">{label}</h3>
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-muted-foreground truncate">{description}</p>
            {optionsCount && optionsCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full whitespace-nowrap">
                  {optionsCount} {optionsCount === 1 ? 'option' : 'options'} available
                </span>
                {isCollapsed && cheapestOption !== undefined && cheapestOption !== null && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                    {cheapestOption === 0 ? 'free options' : `from $${cheapestOption}`}
                  </span>
                )}
                {onOpenPanel && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenPanel();
                    }}
                    className="text-xs px-2 py-0.5 rounded bg-accent hover:bg-accent/80 text-accent-foreground transition-colors"
                  >
                    🔍 Compare
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Progress Indicator */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <div className="text-right">
            <div className="text-xs font-semibold">{creditsEarned}/{creditsRequired}</div>
            <div className="text-xs text-muted-foreground">credits</div>
          </div>
          <div className="relative w-12 h-12">
            <svg className="transform -rotate-90" width="48" height="48">
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="text-muted/20"
              />
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 20}`}
                strokeDashoffset={`${2 * Math.PI * 20 * (1 - progress / 100)}`}
                className="text-primary transition-all duration-300"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">
              {Math.round(progress)}%
            </div>
          </div>
        </div>
      </div>
      
      {/* Courses List - Expandable */}
      {!isCollapsed && courses.length > 0 && (
        <div className="module-courses p-4 pt-0 space-y-2" onClick={e => e.stopPropagation()}>
          {courses.map(course => (
            <CourseCard
              key={course.courseId}
              courseId={course.courseId}
              title={course.title}
              credits={course.credits}
              subject={course.subject}
              onClick={() => onCourseClick?.(course.courseId)}
            />
          ))}
        </div>
      )}
      
      {/* Available Options - Expandable */}
      {!isCollapsed && marketplaceOptions && marketplaceOptions.length > 0 && (
        <div className="module-courses p-4 pt-0 space-y-2" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-muted-foreground">
              Available Options
            </div>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs px-2 py-1 rounded border border-border bg-background hover:bg-accent/50 cursor-pointer transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <option value="cheapest">💰 Cheapest</option>
              <option value="shortest">⚡ Shortest</option>
              <option value="credits">📊 Most Credits</option>
            </select>
          </div>
          {sortedOptions.map(option => {
            const isSelected = selectedIds.includes(option.courseId);
            const optionCredits = Number(option.credits) || 0;
            const wouldExceedYearCap = !isSelected && yearEarned + optionCredits > yearCap;
            const atMax = !isSelected && (selections[id]?.selectedCredits ?? 0) >= creditsRequired;
            
            return (
              <div
                key={option.id}
                className={`course-card bg-background rounded-md p-1.5 hover:bg-accent/50 transition-all flex items-center gap-2 ${
                  isSelected ? 'border-2 border-primary bg-primary/5' : 'border border-border'
                }`}
              >
                <Checkbox 
                  checked={isSelected}
                  onCheckedChange={() => {
                    if (!atMax && !wouldExceedYearCap) {
                      toggleCourse(id, option.courseId, optionCredits, creditsRequired);
                    }
                  }}
                  disabled={atMax || wouldExceedYearCap}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium truncate leading-tight">
                    {option.courseId}: {option.title}
                  </div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5 flex-wrap">
                    <span>{option.credits} cr</span>
                    
                    {/* Provider badge with icon */}
                    {option.providerType && (
                      <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        option.providerType === 'university' 
                          ? 'bg-blue-100 text-blue-700'
                          : option.providerType === 'mooc'
                          ? 'bg-purple-100 text-purple-700'
                          : option.providerType === 'bootcamp'
                          ? 'bg-orange-100 text-orange-700'
                          : option.providerType === 'testing_center'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {option.providerType === 'university' && '🎓'}
                        {option.providerType === 'mooc' && '🌐'}
                        {option.providerType === 'bootcamp' && '⚡'}
                        {option.providerType === 'testing_center' && '📝'}
                        {' '}{option.provider}
                      </span>
                    )}
                    
                    {/* Price badge */}
                {option.cost_usd !== null && (
                  <span className="ml-1 px-1.5 py-0.5 rounded bg-green-100 text-green-700 text-[10px] font-medium">
                    {option.cost_usd === 0 ? 'Included' : `$${new Intl.NumberFormat().format(option.cost_usd)}`}
                  </span>
                )}
                    
                    {/* Duration */}
                    {option.duration_weeks && (
                      <span className="ml-1 text-[10px]">
                        {option.duration_weeks}w
                      </span>
                    )}
                  </div>
                </div>
                {isSelected ? (
                  <Badge variant="default" className="text-[10px] px-2 py-0.5 whitespace-nowrap">
                    ✓ Selected
                  </Badge>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!atMax && !wouldExceedYearCap) {
                        toggleCourse(id, option.courseId, optionCredits, creditsRequired);
                      }
                    }}
                    disabled={atMax || wouldExceedYearCap}
                    className={`text-[10px] px-2 py-1 rounded transition-colors whitespace-nowrap ${
                      atMax || wouldExceedYearCap
                        ? 'bg-muted text-muted-foreground cursor-not-allowed'
                        : 'bg-primary/10 text-primary hover:bg-primary/20'
                    }`}
                    title={
                      wouldExceedYearCap && !isSelected
                        ? `Year cap reached (${yearCap} cr)`
                        : atMax
                        ? 'Module max reached'
                        : ''
                    }
                  >
                    {(atMax || wouldExceedYearCap) ? 'Cap Reached' : 'Select'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state when no options available */}
      {!isCollapsed && (!marketplaceOptions || marketplaceOptions.length === 0) && courses.length === 0 && (
        <div className="p-4 text-xs text-muted-foreground italic text-center">
          No options available yet.
        </div>
      )}
    </div>
  );
}
