import { useMemo, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScopeBreadcrumbs } from './ScopeBreadcrumbs';
import type { ModuleData } from '../types/v5';

interface YearMarketplacePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  modules: ModuleData[];
  degreeTitle?: string;
  onNavigate: (scope: any, nodeId?: string, nodeData?: any) => void;
  onOpenModulePanel: (module: ModuleData) => void;
}

export function YearMarketplacePanel({
  open,
  onOpenChange,
  year,
  modules,
  degreeTitle,
  onNavigate,
  onOpenModulePanel
}: YearMarketplacePanelProps) {
  // Calculate year totals
  const yearStats = useMemo(() => {
    const totalCreditsRequired = modules.reduce((sum, m) => sum + m.creditsRequired, 0);
    const totalCreditsEarned = modules.reduce((sum, m) => sum + (m.creditsEarned || 0), 0);
    const unmetModules = modules.filter(m => (m.creditsEarned || 0) < m.creditsRequired);
    
    return {
      totalCreditsRequired,
      totalCreditsEarned,
      unmetModules,
      progressPercent: totalCreditsRequired > 0 
        ? Math.round((totalCreditsEarned / totalCreditsRequired) * 100)
        : 0
    };
  }, [modules]);

  const previousFocusRef = useRef<HTMLElement | null>(null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        className="w-[600px] sm:w-[700px] overflow-y-auto"
        role="dialog"
        aria-labelledby="year-panel-title"
        onOpenAutoFocus={(e) => {
          previousFocusRef.current = document.activeElement as HTMLElement;
        }}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          previousFocusRef.current?.focus();
        }}
      >
        <SheetHeader className="mb-4">
          <ScopeBreadcrumbs
            scope="year"
            year={year}
            degreeTitle={degreeTitle}
            onNavigate={onNavigate}
          />
          <SheetTitle id="year-panel-title" className="text-lg">Year {year} Marketplace</SheetTitle>
        </SheetHeader>

        {/* Year Stats Header */}
        <div className="bg-accent/30 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-3 gap-4 text-sm mb-3">
            <div>
              <div className="text-xs text-muted-foreground">Credits</div>
              <div className="font-semibold text-lg">
                {yearStats.totalCreditsEarned}/{yearStats.totalCreditsRequired}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Progress</div>
              <div className="font-semibold text-lg">{yearStats.progressPercent}%</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Remaining</div>
              <div className="font-semibold text-lg">{yearStats.unmetModules.length}</div>
              <div className="text-xs text-muted-foreground">modules</div>
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="flex gap-2">
            <Button size="sm" variant="default" className="flex-1">
              ✨ Auto-Fill Year
            </Button>
            <Button size="sm" variant="outline" className="flex-1">
              🗑️ Clear Year
            </Button>
          </div>
        </div>

        {/* Unmet Requirements */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Unmet Requirements</h3>
            <Badge variant="secondary">{yearStats.unmetModules.length} modules</Badge>
          </div>

          {yearStats.unmetModules.length === 0 ? (
            <div className="bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg p-6 text-center">
              <div className="text-2xl mb-2">✓</div>
              <div className="font-medium">All requirements met for Year {year}!</div>
            </div>
          ) : (
            <div className="space-y-3">
              {yearStats.unmetModules.map(module => (
                <div
                  key={module.id}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="font-medium text-sm mb-1">{module.label}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {module.description}
                      </div>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      {module.creditsRequired} cr
                    </Badge>
                  </div>

                  {/* Top options preview */}
                  {module.marketplaceOptions && module.marketplaceOptions.length > 0 && (
                    <div className="space-y-1 mb-3">
                      {module.marketplaceOptions.slice(0, 3).map((option, idx) => (
                        <div
                          key={option.id}
                          className="text-xs text-muted-foreground flex items-center justify-between"
                        >
                          <span className="truncate">{option.provider}: {option.title}</span>
                          <span className="ml-2 text-nowrap">
                            {option.cost_usd !== null ? `$${option.cost_usd}` : 'Free'}
                          </span>
                        </div>
                      ))}
                      {module.marketplaceOptions.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{module.marketplaceOptions.length - 3} more options
                        </div>
                      )}
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      onOpenModulePanel(module);
                      onOpenChange(false);
                    }}
                  >
                    View All Options ({module.optionsCount || 0})
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Semester Planning placeholder */}
        <div className="mt-8 pt-6 border-t">
          <h3 className="font-medium mb-3">Semester Planning</h3>
          <div className="bg-accent/20 rounded-lg p-6 text-center">
            <div className="text-muted-foreground text-sm">
              Drag-and-drop semester lanes coming in Week 2...
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
