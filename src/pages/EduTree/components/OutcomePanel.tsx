import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, DollarSign, TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react';
import { PlanningLens } from '@/lib/types/eduTree';

export interface PlanValidationSummary {
  totalCredits: number;
  completedCredits: number;
  estimatedMonths: number;
  estimatedCost: number;
  planValid: boolean;
  issues: string[];
}

interface OutcomePanelProps {
  summary: PlanValidationSummary;
  selectedLens: PlanningLens;
  isVisible: boolean;
}

export function OutcomePanel({ summary, selectedLens, isVisible }: OutcomePanelProps) {
  if (!isVisible) return null;
  
  const completionPercent = (summary.completedCredits / summary.totalCredits) * 100;
  
  const lensIcons = {
    fastest: Clock,
    cheapest: DollarSign,
    roi: TrendingUp
  };
  
  const LensIcon = lensIcons[selectedLens];
  
  return (
    <Card className="fixed bottom-4 right-4 w-80 shadow-lg border-2 z-10 pointer-events-auto">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <LensIcon className="w-5 h-5" />
            Plan Summary
          </CardTitle>
          <Badge variant={summary.planValid ? "default" : "destructive"} className="text-xs">
            {summary.planValid ? (
              <>
                <CheckCircle className="w-3 h-3 mr-1" />
                Valid
              </>
            ) : (
              <>
                <AlertTriangle className="w-3 h-3 mr-1" />
                Issues
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Credits Progress</span>
            <span>{summary.completedCredits}/{summary.totalCredits}</span>
          </div>
          <Progress value={completionPercent} className="h-2" />
        </div>
        
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <div>
              <div className="font-medium">{summary.estimatedMonths} mo</div>
              <div className="text-xs text-muted-foreground">Est. time</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <div>
              <div className="font-medium">${summary.estimatedCost.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Est. cost</div>
            </div>
          </div>
        </div>
        
        {/* Plan Issues */}
        {!summary.planValid && summary.issues.length > 0 && (
          <div className="p-2 rounded bg-destructive/10 border border-destructive/20">
            <div className="text-xs font-medium text-destructive mb-1">Plan Issues:</div>
            <ul className="text-xs text-destructive space-y-0.5">
              {summary.issues.slice(0, 3).map((issue, index) => (
                <li key={index}>• {issue}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Lens-specific tip */}
        <div className="p-2 rounded bg-accent/10 border border-accent/20">
          <div className="text-xs text-muted-foreground">
            {selectedLens === 'fastest' && 'Focus on prerequisite chains and summer courses'}
            {selectedLens === 'cheapest' && 'Consider alternative credit options where available'}
            {selectedLens === 'roi' && 'Prioritize specializations with high market demand'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}