/**
 * ComplianceScorePanel - Real-time policy health dashboard
 * Shows transfer credit usage, residency status, and overall compliance
 */
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ComplianceMetrics } from '../engine/CreditPolicyEngine';
import { AlertCircle, CheckCircle, Clock, Shield } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ComplianceScorePanelProps {
  metrics: ComplianceMetrics;
}

export function ComplianceScorePanel({ metrics }: ComplianceScorePanelProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Good';
    if (score >= 60) return 'Fair';
    return 'At Risk';
  };

  const transferPercent = (metrics.transferCreditsUsed / metrics.transferCreditsMax) * 100;
  const residencyPercent = (metrics.residencyCreditsEarned / metrics.residencyCreditsRequired) * 100;

  const errorCount = metrics.violations.filter(v => v.severity === 'error').length;
  const warningCount = metrics.violations.filter(v => v.severity === 'warning').length;

  return (
    <Card className="p-4 space-y-4 bg-card/95 backdrop-blur shadow-lg border-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-sm">Policy Compliance</h3>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-bold ${getScoreColor(metrics.overallScore)}`}>
                  {metrics.overallScore}
                </span>
                <Badge variant={metrics.overallScore >= 80 ? 'default' : metrics.overallScore >= 60 ? 'secondary' : 'destructive'}>
                  {getScoreLabel(metrics.overallScore)}
                </Badge>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs space-y-1">
                <div>Overall compliance health (0-100)</div>
                <div className="text-muted-foreground">
                  Based on transfer limits, residency, and policy violations
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Transfer Credits Gauge */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Transfer Credits
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  Credits earned from transfer, CLEP, or other non-institutional sources
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <span className="font-medium">
            {metrics.transferCreditsUsed} / {metrics.transferCreditsMax}
          </span>
        </div>
        <Progress 
          value={transferPercent} 
          className="h-2"
        />
        {transferPercent > 90 && (
          <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-3 w-3" />
            <span>Near transfer limit</span>
          </div>
        )}
      </div>

      {/* Residency Credits Gauge */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Residency Credits
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  Credits that must be earned in-residence at the institution
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <span className="font-medium">
            {metrics.residencyCreditsEarned} / {metrics.residencyCreditsRequired}
          </span>
        </div>
        <Progress 
          value={residencyPercent} 
          className="h-2"
        />
        {residencyPercent < 100 && (
          <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-3 w-3" />
            <span>Need {metrics.residencyCreditsRequired - metrics.residencyCreditsEarned} more</span>
          </div>
        )}
      </div>

      {/* Expired Courses Warning */}
      {metrics.expiredCourses > 0 && (
        <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">{metrics.expiredCourses} expired course(s)</span>
          </div>
        </div>
      )}

      {/* Violations Summary */}
      {(errorCount > 0 || warningCount > 0) && (
        <div className="pt-2 border-t border-border space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Active Issues</div>
          <div className="flex items-center gap-3">
            {errorCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {errorCount} Error{errorCount > 1 ? 's' : ''}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {warningCount} Warning{warningCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* All Clear */}
      {errorCount === 0 && warningCount === 0 && (
        <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 bg-green-500/10 p-2 rounded">
          <CheckCircle className="h-4 w-4" />
          <span className="font-medium">All policy checks passed</span>
        </div>
      )}
    </Card>
  );
}
