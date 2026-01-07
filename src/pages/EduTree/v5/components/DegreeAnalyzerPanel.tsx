import { useRef, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScopeBreadcrumbs } from './ScopeBreadcrumbs';
import { GraduationChecklist } from './GraduationChecklist';
import { usePlanBasket } from '../state/usePlanBasket';
import { getAnchorPolicy } from '@/lib/degree/institutionPolicies';
import type { DegreeSummary } from '../types/v5';

interface DegreeAnalyzerPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  degreeSummary: DegreeSummary;
  activeTab?: string;
  onTabChange: (tab: string) => void;
  onNavigate: (scope: any, nodeId?: string) => void;
  anchorSchool?: string;
}

export function DegreeAnalyzerPanel({
  open,
  onOpenChange,
  degreeSummary,
  activeTab = 'overview',
  onTabChange,
  onNavigate,
  anchorSchool = 'TESU'
}: DegreeAnalyzerPanelProps) {
  const progressPercent = (degreeSummary.totalCreditsEarned / degreeSummary.totalCreditsRequired) * 100;
  const previousFocusRef = useRef<HTMLElement | null>(null);
  
  // Get basket and policy for graduation checklist
  const basket = usePlanBasket(state => state.items);
  const policy = useMemo(() => getAnchorPolicy(anchorSchool), [anchorSchool]);
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        className="w-[600px] sm:w-[700px] overflow-y-auto"
        role="dialog"
        aria-labelledby="degree-panel-title"
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
            scope="degree"
            degreeTitle={degreeSummary.degreeTitle}
            onNavigate={onNavigate}
          />
          <SheetTitle id="degree-panel-title" className="text-lg">Degree Analyzer</SheetTitle>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="requirements">Requirements</TabsTrigger>
            <TabsTrigger value="transfer">Transfer</TabsTrigger>
            <TabsTrigger value="optimize">Optimize</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Progress Ring */}
            <div className="bg-accent/30 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{degreeSummary.degreeTitle}</h3>
                  <p className="text-sm text-muted-foreground">Bachelor's Degree</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary">{Math.round(progressPercent)}%</div>
                  <div className="text-xs text-muted-foreground">Complete</div>
                </div>
              </div>
              
              <Progress value={progressPercent} className="h-3 mb-2" />
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {degreeSummary.totalCreditsEarned} / {degreeSummary.totalCreditsRequired} credits
                </span>
                <span className="text-muted-foreground">
                  {degreeSummary.totalCreditsRequired - degreeSummary.totalCreditsEarned} remaining
                </span>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-card border rounded-lg p-4">
                <div className="text-xs text-muted-foreground mb-1">Total Cost</div>
                <div className="text-2xl font-bold">${degreeSummary.estimatedCost.toLocaleString()}</div>
              </div>
              <div className="bg-card border rounded-lg p-4">
                <div className="text-xs text-muted-foreground mb-1">Duration</div>
                <div className="text-2xl font-bold">{Math.round(degreeSummary.estimatedMonths / 12)}y</div>
                <div className="text-xs text-muted-foreground">{degreeSummary.estimatedMonths} months</div>
              </div>
              <div className="bg-card border rounded-lg p-4">
                <div className="text-xs text-muted-foreground mb-1">Credits Planned</div>
                <div className="text-2xl font-bold">{degreeSummary.totalCreditsPlanned}</div>
              </div>
            </div>

            {/* Warnings */}
            {degreeSummary.warnings.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">⚠️ Warnings</h4>
                {degreeSummary.warnings.map((warning, i) => (
                  <div key={i} className="text-sm p-3 rounded-md bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                    {warning}
                  </div>
                ))}
              </div>
            )}

            {/* Graduation Readiness Checklist */}
            <div className="bg-accent/20 rounded-lg p-4">
              <GraduationChecklist basket={basket} policy={policy} />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1">
                📊 Export Plan (PDF)
              </Button>
              <Button variant="outline" className="flex-1">
                📤 Share with Advisor
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="requirements" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              View all requirements grouped by category (Gen Ed, Core, Major, Electives).
            </p>
            
            {/* Placeholder for requirements map */}
            <div className="bg-accent/20 rounded-lg p-8 text-center">
              <div className="text-muted-foreground text-sm">
                Requirements breakdown coming soon...
              </div>
            </div>
          </TabsContent>

          <TabsContent value="transfer" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Visualize credit transfer flow from providers to target institution.
            </p>
            
            {/* Placeholder for transfer flow */}
            <div className="bg-accent/20 rounded-lg p-8 text-center">
              <div className="text-muted-foreground text-sm">
                Transfer flow diagram coming soon...
              </div>
            </div>
          </TabsContent>

          <TabsContent value="optimize" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Auto-fill entire degree with optimized course selections.
            </p>
            
            {/* Strategy presets */}
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-auto flex-col items-start p-4">
                <div className="text-sm font-medium mb-1">⚡ Fastest Path</div>
                <div className="text-xs text-muted-foreground">Minimize duration</div>
              </Button>
              <Button variant="outline" className="h-auto flex-col items-start p-4">
                <div className="text-sm font-medium mb-1">💰 Cheapest Path</div>
                <div className="text-xs text-muted-foreground">Minimize cost</div>
              </Button>
              <Button variant="outline" className="h-auto flex-col items-start p-4">
                <div className="text-sm font-medium mb-1">🎓 Transfer-Safe</div>
                <div className="text-xs text-muted-foreground">Guaranteed acceptance</div>
              </Button>
              <Button variant="outline" className="h-auto flex-col items-start p-4">
                <div className="text-sm font-medium mb-1">⚖️ Balanced</div>
                <div className="text-xs text-muted-foreground">Best overall</div>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
