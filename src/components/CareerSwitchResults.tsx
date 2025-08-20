import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { type CareerSwitchAnalysis } from '@/lib/switching';

interface CareerSwitchResultsProps {
  analysis: CareerSwitchAnalysis;
}

export const CareerSwitchResults: React.FC<CareerSwitchResultsProps> = ({ analysis }) => {
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Low': return 'text-success border-success/20 bg-success/10';
      case 'Medium': return 'text-warning border-warning/20 bg-warning/10';
      case 'High': return 'text-destructive border-destructive/20 bg-destructive/10';
      default: return 'text-muted-foreground border-border bg-muted/50';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatTime = (hours: number) => {
    const weeks = Math.round(hours / 40);
    if (weeks < 1) return `${hours}h`;
    if (weeks < 52) return `${weeks} weeks`;
    return `${Math.round(weeks / 52 * 10) / 10} years`;
  };

  return (
    <div className="space-y-6 pt-6 border-t">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {analysis.tracks.from} → {analysis.tracks.to}
        </h3>
        <Badge 
          variant="outline" 
          className={getRiskColor(analysis.riskAnalysis.riskLevel)}
        >
          <AlertTriangle className="h-3 w-3 mr-1" />
          {analysis.riskAnalysis.riskLevel} Risk
        </Badge>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20">
          <div className="text-2xl font-bold text-primary mb-1">
            {analysis.metrics.skillOverlap}%
          </div>
          <div className="text-sm text-muted-foreground">Skill Overlap</div>
          <div className="text-xs text-primary/70 mt-1">
            {analysis.metrics.transferCredit}% transfer credit
          </div>
        </div>

        <div className="text-center p-4 bg-gradient-to-br from-success/5 to-success/10 rounded-lg border border-success/20">
          <div className="text-2xl font-bold text-success mb-1">
            {formatCurrency(analysis.metrics.roi3yr)}
          </div>
          <div className="text-sm text-muted-foreground">3-Year ROI</div>
          <div className="text-xs text-success/70 mt-1 flex items-center justify-center gap-1">
            {analysis.metrics.roi3yr > 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {analysis.metrics.criDelta > 0 ? '+' : ''}{analysis.metrics.criDelta} CRI
          </div>
        </div>

        <div className="text-center p-4 bg-gradient-to-br from-warning/5 to-warning/10 rounded-lg border border-warning/20">
          <div className="text-2xl font-bold text-warning mb-1">
            {formatCurrency(analysis.metrics.switchCost)}
          </div>
          <div className="text-sm text-muted-foreground">Switch Cost</div>
          <div className="text-xs text-warning/70 mt-1 flex items-center justify-center gap-1">
            <DollarSign className="h-3 w-3" />
            Direct investment
          </div>
        </div>

        <div className="text-center p-4 bg-gradient-to-br from-info/5 to-info/10 rounded-lg border border-info/20">
          <div className="text-2xl font-bold text-info mb-1">
            {analysis.metrics.breakEvenMonths}
          </div>
          <div className="text-sm text-muted-foreground">Months to Break Even</div>
          <div className="text-xs text-info/70 mt-1 flex items-center justify-center gap-1">
            <Clock className="h-3 w-3" />
            Recovery time
          </div>
        </div>
      </div>

      {/* Time Investment Analysis */}
      <div className="space-y-3">
        <h4 className="font-medium flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Time Investment Analysis
        </h4>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-3 bg-success/5 rounded-lg border border-success/20">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Time Saved:</span>
              <span className="font-medium text-success">
                {formatTime(analysis.metrics.timeGained)}
              </span>
            </div>
            <div className="text-xs text-success/70 mt-1">
              From transferable skills
            </div>
          </div>
          
          <div className="p-3 bg-warning/5 rounded-lg border border-warning/20">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Additional Learning:</span>
              <span className="font-medium text-warning">
                {formatTime(analysis.metrics.timeLost)}
              </span>
            </div>
            <div className="text-xs text-warning/70 mt-1">
              New skills to acquire
            </div>
          </div>
        </div>
      </div>

      {/* Risk Analysis */}
      <div className="space-y-3">
        <h4 className="font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Risk Assessment ({analysis.riskAnalysis.overallRisk}% overall risk)
        </h4>
        <div className="grid sm:grid-cols-2 gap-3">
          {Object.entries(analysis.riskAnalysis.breakdown).map(([key, value]) => {
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            const riskLevel = value > 60 ? 'High' : value > 30 ? 'Medium' : 'Low';
            const colorClass = getRiskColor(riskLevel);
            
            return (
              <div key={key} className={`p-3 rounded-lg border ${colorClass}`}>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{label}:</span>
                  <span className="font-bold">{value}%</span>
                </div>
                <div className="w-full bg-background/50 rounded-full h-2 mt-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      riskLevel === 'High' ? 'bg-destructive' : 
                      riskLevel === 'Medium' ? 'bg-warning' : 'bg-success'
                    }`}
                    style={{ width: `${Math.min(value, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};