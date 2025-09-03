// Metrics pill component for displaying path summary

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, DollarSign, BookOpen, Building2, CheckCircle } from 'lucide-react';

interface PathMetrics {
  totalTime: number;
  totalCost: number;
  totalCredits: number;
  creditLoss: number;
  institutionsCount?: number;
  prerequisitesSatisfied?: number;
}

interface MetricsPillProps {
  metrics: PathMetrics;
  className?: string;
}

export function MetricsPill({ metrics, className = '' }: MetricsPillProps) {
  const formatCost = (cost: number) => `$${(cost / 1000).toFixed(0)}k`;
  const formatCredits = (total: number, loss: number) => `${total - loss}/${total} credits`;

  return (
    <div className={`flex items-center gap-2 p-3 bg-card rounded-lg border ${className}`}>
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Clock className="w-4 h-4" />
        <span className="font-medium">{metrics.totalTime}mo</span>
      </div>
      
      <div className="w-px h-4 bg-border" />
      
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <DollarSign className="w-4 h-4" />
        <span className="font-medium">{formatCost(metrics.totalCost)}</span>
      </div>
      
      <div className="w-px h-4 bg-border" />
      
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <BookOpen className="w-4 h-4" />
        <span className="font-medium">{formatCredits(metrics.totalCredits, metrics.creditLoss)}</span>
      </div>
      
      {metrics.institutionsCount && (
        <>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Building2 className="w-4 h-4" />
            <span className="font-medium">{metrics.institutionsCount} inst</span>
          </div>
        </>
      )}
      
      {metrics.prerequisitesSatisfied && (
        <>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <CheckCircle className="w-4 h-4" />
            <span className="font-medium">{metrics.prerequisitesSatisfied} prereqs</span>
          </div>
        </>
      )}
    </div>
  );
}

export default MetricsPill;