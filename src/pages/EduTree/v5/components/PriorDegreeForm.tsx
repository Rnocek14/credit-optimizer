import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap } from 'lucide-react';

/**
 * Phase 1d: Prior Degree Form (Stub - Non-functional)
 * Will be implemented when v5_pivot_mode is enabled
 */
export function PriorDegreeForm() {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <GraduationCap className="h-6 w-6 text-primary" />
        <h3 className="font-semibold">Prior Degree Credit Maximizer</h3>
      </div>
      
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This feature helps you maximize transfer credits from your previous degree.
        </p>
        
        <div className="bg-muted/30 rounded-lg p-4 text-center">
          <p className="text-sm font-medium">Feature in Development</p>
          <p className="text-xs text-muted-foreground mt-2">
            Enable with: <code className="bg-muted px-2 py-1 rounded">localStorage.setItem('v5_pivot_mode', 'true')</code>
          </p>
        </div>
        
        <Button disabled className="w-full">
          Enter Prior Degree Info
        </Button>
      </div>
    </Card>
  );
}
