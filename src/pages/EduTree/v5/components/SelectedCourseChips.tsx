import { useState, useRef, useEffect, useMemo } from 'react';
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, X, HelpCircle } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from 'sonner';
import { trackTelemetryEvent } from '@/utils/telemetry';
import { shouldSample, getClientSessionId } from '@/utils/telemetrySampling';
import { formatCost, formatDuration, formatCRI, formatWorkload } from '../utils/formatters';
import type { BasketItem } from "../state/usePlanBasket";

interface SelectedCourseChipsProps {
  moduleId: string;
  moduleLabel?: string;
  basketItems: BasketItem[];
  onRemove: (courseId: string) => void;
  creditsRequired: number;
}

export function SelectedCourseChips({
  moduleId,
  moduleLabel,
  basketItems,
  onRemove,
  creditsRequired,
}: SelectedCourseChipsProps) {
  const totalCredits = basketItems.reduce((sum, item) => sum + item.credits, 0);
  const isOverCredits = totalCredits > creditsRequired;
  
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const chipsRef = useRef<(HTMLDivElement | null)[]>([]);
  
  const getStatusIcon = (status: BasketItem['status']) => {
    switch (status) {
      case 'auto-filled': return '🤖';
      case 'pinned': return '👤';
      case 'prereq': return '⛓️';
      default: return null;
    }
  };
  
  const getStatusLabel = (status: BasketItem['status']) => {
    switch (status) {
      case 'auto-filled': return 'Auto-filled';
      case 'pinned': return 'Pinned';
      case 'prereq': return 'Prerequisite';
      default: return 'Manual';
    }
  };
  
  // Smart removal suggestions: auto-filled/prereq first, exclude pinned, lowest CRI first
  const suggestedRemovals = useMemo(() => {
    if (!isOverCredits) return [];
    
    return [...basketItems]
      .filter(item => 
        item.status !== 'pinned' && 
        (item.status === 'auto-filled' || item.status === 'prereq')
      )
      .sort((a, b) => {
        // Auto-filled first
        if (a.status === 'auto-filled' && b.status !== 'auto-filled') return -1;
        if (b.status === 'auto-filled' && a.status !== 'auto-filled') return 1;
        // Then by lowest CRI
        return a.cri_score - b.cri_score;
      })
      .slice(0, 3);
  }, [basketItems, isOverCredits]);
  
  // Local keyboard handler (not global)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (focusedIndex === -1) return;
    
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setFocusedIndex(Math.max(0, focusedIndex - 1));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setFocusedIndex(Math.min(basketItems.length - 1, focusedIndex + 1));
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      const item = basketItems[focusedIndex];
      if (item) {
        onRemove(item.courseId);
        toast.message(`Removed ${item.courseId}`, {
          description: `${item.credits}cr freed`,
        });
        
        // Sample chip removal events at 25%
        if (shouldSample(0.25)) {
          void trackTelemetryEvent({
            task: 'chip_removed',
            scope: 'module',
            complexity: {
              moduleId,
              courseId: item.courseId,
              source: item.status,
              credits: item.credits,
              cri: item.cri_score,
              sessionId: getClientSessionId(),
            },
          });
        }
        
        // Move focus after removal
        const newIndex = Math.min(focusedIndex, basketItems.length - 2);
        if (newIndex < 0) {
          // Focus add course button or chips list container as fallback
          setFocusedIndex(-1);
          const addBtn = document.querySelector('[data-add-course-btn]') as HTMLElement;
          const chipsList = document.querySelector('[data-chips-list]') as HTMLElement;
          if (addBtn) {
            addBtn.focus();
          } else if (chipsList) {
            chipsList.focus();
          }
        } else {
          setFocusedIndex(newIndex);
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setFocusedIndex(-1);
      chipsRef.current[focusedIndex]?.blur();
    }
  };
  
  // Auto-focus when index changes
  useEffect(() => {
    if (focusedIndex >= 0 && chipsRef.current[focusedIndex]) {
      chipsRef.current[focusedIndex]?.focus();
    }
  }, [focusedIndex]);

  return (
    <div className="space-y-3" role="group" aria-label="Selected courses">
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="text-muted-foreground">
          {basketItems.length} course{basketItems.length !== 1 ? 's' : ''} selected
        </span>
        <span className={totalCredits > creditsRequired ? 'text-yellow-600 dark:text-yellow-400 font-medium' : 'text-muted-foreground'}>
          {totalCredits}/{creditsRequired} cr
        </span>
      </div>

      <div 
        role="listbox" 
        aria-label={`Selected courses for ${moduleLabel || 'this module'}`}
        aria-activedescendant={focusedIndex >= 0 ? `chip-${focusedIndex}` : undefined}
        data-chips-list
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="flex flex-wrap gap-2"
      >
        {basketItems.map((item, index) => (
          <HoverCard key={`${item.moduleId}:${item.courseId}:${item.providerCode || ''}`} openDelay={150}>
            <HoverCardTrigger asChild>
              <div
                id={`chip-${index}`}
                ref={(el) => { chipsRef.current[index] = el; }}
                role="option"
                aria-selected={focusedIndex === index}
                tabIndex={focusedIndex === index || (focusedIndex === -1 && index === 0) ? 0 : -1}
                onFocus={() => setFocusedIndex(index)}
                onBlur={() => setFocusedIndex(-1)}
                className="group relative flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 rounded-md text-xs border border-blue-200 dark:border-blue-800 cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
              >
                <span aria-hidden="true">{getStatusIcon(item.status)}</span>
                <span className="font-medium truncate max-w-[140px]">{item.courseId}</span>
                <span className="text-blue-700 dark:text-blue-300">({item.credits}cr)</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(item.courseId);
                  }}
                  className="ml-1 p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800 rounded opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
                  aria-label={`Remove ${item.courseId}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </HoverCardTrigger>
            
            <HoverCardContent side="top" align="start" className="w-64">
              <div className="space-y-2 text-xs">
                <div>
                  <div className="font-semibold text-sm mb-1 flex items-center gap-2">
                    <span>{item.title || item.courseId}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span aria-hidden="true">{getStatusIcon(item.status)}</span>
                    <span>{getStatusLabel(item.status)}</span>
                  </div>
                  {item.providerCode && (
                    <div className="text-muted-foreground mt-1">
                      Provider: {item.providerCode}
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <div>
                    <div className="text-muted-foreground">Cost</div>
                    <div className="font-medium">{formatCost(item.cost_usd)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Duration</div>
                    <div className="font-medium">{formatDuration(item.duration_weeks)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">CRI Score</div>
                    <div className="font-medium">{formatCRI(item.cri_score)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Workload</div>
                    <div className="font-medium">{formatWorkload(item.workload_weekly_hours)}</div>
                  </div>
                </div>
                
                {item.source?.templateLabel && (
                  <div className="pt-2 border-t text-muted-foreground">
                    From "{item.source.templateLabel}" template
                  </div>
                )}
              </div>
            </HoverCardContent>
          </HoverCard>
        ))}
      </div>

      {isOverCredits && (
        <div className="px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
            <span className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
              {totalCredits - creditsRequired} credits over requirement
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300">
                    <HelpCircle className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">
                  You've selected more credits than required. Consider removing auto-filled or 
                  low-impact courses (shown below) to meet the exact requirement.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {suggestedRemovals.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
                💡 Suggested removals (lowest impact):
              </div>
              <div className="space-y-1">
                {suggestedRemovals.map(item => (
                  <button
                    key={item.courseId}
                    onClick={() => {
                      onRemove(item.courseId);
                      void trackTelemetryEvent({
                        task: 'overcredit_suggestion_clicked',
                        scope: 'module',
                        complexity: { 
                          courseId: item.courseId, 
                          cri: item.cri_score,
                          sessionId: getClientSessionId(),
                        }
                      });
                    }}
                    className="w-full text-left text-xs px-2 py-1 rounded hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition-colors flex items-center justify-between"
                  >
                    <span>
                      {getStatusIcon(item.status)} {item.courseId} (CRI {Math.round(item.cri_score)})
                    </span>
                    <X className="h-3 w-3 opacity-60" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
