import { useEvaluatePlan } from '@/hooks/useEvaluatePlan';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, DollarSign, BookOpen } from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface PlanDashboardProps {
  planId: string;
}

export function PlanDashboard({ planId }: PlanDashboardProps) {
  const { data: evaluation, isLoading, error } = useEvaluatePlan(planId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
          Error loading plan evaluation
        </div>
      </div>
    );
  }

  if (!evaluation) return null;

  const creditsProgress = (evaluation.credits_total / 120) * 100;
  const transferProgress = (evaluation.transfer_used / evaluation.transfer_cap) * 100;
  const residencyProgress = (evaluation.residency_progress / evaluation.residency_required) * 100;

  return (
    <div className="h-full overflow-y-auto bg-background/95 backdrop-blur-sm">
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Degree Plan</h2>
        </div>

        {/* Credits Overview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Total Credits</span>
              <span className="text-lg font-bold">{evaluation.credits_total} / 120</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress value={creditsProgress} className="h-2" />
            <div className="text-xs text-muted-foreground">
              {Math.round(creditsProgress)}% complete
            </div>
          </CardContent>
        </Card>

        {/* Credits by Category */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">By Category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(evaluation.credits_by_category).map(([category, credits]) => (
              <div key={category} className="flex justify-between items-center text-xs">
                <span className="capitalize text-muted-foreground">{category.replace(/_/g, ' ')}</span>
                <span className="font-medium">{credits} cr</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Transfer & Residency */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Transfer & Residency</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Transfer Used</span>
                <span className="font-medium">{evaluation.transfer_used} / {evaluation.transfer_cap}</span>
              </div>
              <Progress value={transferProgress} className="h-1" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Residency Progress</span>
                <span className="font-medium">{evaluation.residency_progress} / {evaluation.residency_required}</span>
              </div>
              <Progress value={residencyProgress} className="h-1" />
            </div>
            {evaluation.upper_division_credits > 0 && (
              <div className="flex justify-between text-xs pt-1 border-t">
                <span className="text-muted-foreground">Upper Division</span>
                <span className="font-medium">{evaluation.upper_division_credits} cr</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Estimated Cost */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Estimated Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${evaluation.estimated_cost.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Based on selected courses
            </div>
          </CardContent>
        </Card>

        {/* Warnings */}
        {evaluation.warnings.length > 0 && (
          <Card className="border-destructive/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                Warnings ({evaluation.warnings.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {evaluation.warnings.map((warning, i) => (
                <Badge key={i} variant="destructive" className="text-xs font-normal w-full justify-start">
                  {warning}
                </Badge>
              ))}
            </CardContent>
          </Card>
        )}

        {evaluation.warnings.length === 0 && (
          <Card className="border-green-500/50 bg-green-500/5">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle className="h-4 w-4" />
                <span>All requirements on track</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
