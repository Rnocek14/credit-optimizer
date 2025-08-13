import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function TokenBudgetMeter() {
  const [usage, setUsage] = useState({
    tokensUsed: 0,
    costSpent: 0,
    jobsCompleted: 0
  });

  useEffect(() => {
    fetchUsage();
    
    // Set up real-time subscription for usage updates
    const channel = supabase
      .channel('usage')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'ai_analyzer_jobs' 
        },
        () => {
          fetchUsage(); // Refresh usage on job changes
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUsage = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_analyzer_jobs')
        .select('token_usage, cost_estimate, status')
        .eq('status', 'completed');

      if (error) throw error;

      const totals = (data || []).reduce(
        (acc, job) => ({
          tokensUsed: acc.tokensUsed + (job.token_usage || 0),
          costSpent: acc.costSpent + (job.cost_estimate || 0),
          jobsCompleted: acc.jobsCompleted + 1
        }),
        { tokensUsed: 0, costSpent: 0, jobsCompleted: 0 }
      );

      setUsage(totals);
    } catch (error) {
      console.error('Failed to fetch usage:', error);
    }
  };

  // Budget limits (configurable)
  const TOKEN_BUDGET = 100000; // 100k tokens
  const COST_BUDGET = 10.0; // $10

  const tokenPercentage = (usage.tokensUsed / TOKEN_BUDGET) * 100;
  const costPercentage = (usage.costSpent / COST_BUDGET) * 100;

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-600";
    if (percentage >= 70) return "text-yellow-600";
    return "text-green-600";
  };

  const getBudgetStatus = () => {
    const maxPercentage = Math.max(tokenPercentage, costPercentage);
    if (maxPercentage >= 90) return { label: "Critical", color: "bg-red-100 text-red-800" };
    if (maxPercentage >= 70) return { label: "Warning", color: "bg-yellow-100 text-yellow-800" };
    return { label: "Good", color: "bg-green-100 text-green-800" };
  };

  const status = getBudgetStatus();

  return (
    <Card className="w-64">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="text-sm font-medium">Token Budget</span>
          </div>
          <Badge className={status.color}>
            {status.label}
          </Badge>
        </div>

        {/* Token Usage */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>Tokens Used</span>
            <span className={getUsageColor(tokenPercentage)}>
              {usage.tokensUsed.toLocaleString()} / {TOKEN_BUDGET.toLocaleString()}
            </span>
          </div>
          <Progress value={tokenPercentage} className="h-2" />
        </div>

        {/* Cost Usage */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>Cost Spent</span>
            <span className={getUsageColor(costPercentage)}>
              ${usage.costSpent.toFixed(2)} / ${COST_BUDGET.toFixed(2)}
            </span>
          </div>
          <Progress value={costPercentage} className="h-2" />
        </div>

        {/* Jobs Completed */}
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
          <span>Jobs Completed</span>
          <span className="font-medium">{usage.jobsCompleted}</span>
        </div>
      </CardContent>
    </Card>
  );
}