/**
 * Credit Optimizer Dev Tools
 * Quick-load test fixtures to verify Credit Optimizer functionality
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { usePlanBasket } from '../state/usePlanBasket';
import { getTestPlan, type TestPlanType } from '@/fixtures/v5/creditOptimizerTestFixtures';
import { ChevronDown, ChevronUp, FlaskConical } from 'lucide-react';

export function CreditOptimizerDevTools() {
  const [expanded, setExpanded] = useState(false);
  const { loadTestData, clearAll, items } = usePlanBasket();

  const handleLoadTest = (type: TestPlanType) => {
    const testPlan = getTestPlan(type);
    loadTestData(testPlan);
    console.log(`[Dev Tools] Loaded ${type} test plan:`, testPlan.length, 'items');
  };

  if (!expanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setExpanded(true)}
          className="bg-background/95 backdrop-blur shadow-lg border-primary/20"
        >
          <FlaskConical className="w-4 h-4 mr-2" />
          Optimizer Dev Tools
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-background/95 backdrop-blur border border-border rounded-lg shadow-xl p-4 w-72">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Credit Optimizer Test</h3>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setExpanded(false)}
          className="h-6 w-6 p-0"
        >
          <ChevronDown className="w-4 h-4" />
        </Button>
      </div>

      <div className="text-xs text-muted-foreground mb-3">
        Current basket: <span className="font-medium text-foreground">{items.length} courses</span>
      </div>

      <div className="space-y-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleLoadTest('expensive')}
          className="w-full justify-start text-xs h-auto py-2"
        >
          <div className="flex flex-col items-start gap-0.5">
            <span className="font-medium">Load Expensive Plan</span>
            <span className="text-[10px] text-muted-foreground">8 courses • $9K • Should show banner</span>
          </div>
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => handleLoadTest('mixed')}
          className="w-full justify-start text-xs h-auto py-2"
        >
          <div className="flex flex-col items-start gap-0.5">
            <span className="font-medium">Load Mixed Plan</span>
            <span className="text-[10px] text-muted-foreground">3 courses • Moderate savings</span>
          </div>
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => handleLoadTest('optimized')}
          className="w-full justify-start text-xs h-auto py-2"
        >
          <div className="flex flex-col items-start gap-0.5">
            <span className="font-medium">Load Optimized Plan</span>
            <span className="text-[10px] text-muted-foreground">3 courses • No suggestions</span>
          </div>
        </Button>

        <Button
          size="sm"
          variant="destructive"
          onClick={clearAll}
          className="w-full text-xs"
        >
          Clear All Courses
        </Button>
      </div>

      <div className="mt-3 pt-3 border-t border-border text-[10px] text-muted-foreground">
        💡 Tip: Check console for [Credit Optimizer] logs
      </div>
    </div>
  );
}
