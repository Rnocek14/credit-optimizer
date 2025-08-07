import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, DollarSign, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

interface SimulationMetricsData {
  totalDuration: string;
  totalCost: number;
  overallSuccessRate: number;
  riskLevel: string;
  confidence: number;
}

interface SimulationMetricsProps {
  metrics: SimulationMetricsData;
}

export function SimulationMetrics({ metrics }: SimulationMetricsProps) {
  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case 'low': return <CheckCircle className="h-4 w-4" />;
      case 'medium': return <AlertTriangle className="h-4 w-4" />;
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Duration</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalDuration}</div>
          <p className="text-xs text-muted-foreground">
            Estimated completion time
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Investment</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${metrics.totalCost.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            Total financial investment
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.overallSuccessRate.toFixed(0)}%</div>
          <Progress value={metrics.overallSuccessRate} className="mt-2" />
          <p className="text-xs text-muted-foreground mt-2">
            Predicted success probability
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Risk Assessment</CardTitle>
          <div className={getRiskColor(metrics.riskLevel)}>
            {getRiskIcon(metrics.riskLevel)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            <Badge 
              variant={metrics.riskLevel.toLowerCase() === 'low' ? 'default' : 
                     metrics.riskLevel.toLowerCase() === 'medium' ? 'secondary' : 'destructive'}
              className="text-lg px-3 py-1"
            >
              {metrics.riskLevel}
            </Badge>
          </div>
          <div className="mt-2">
            <p className="text-xs text-muted-foreground">Confidence Score</p>
            <Progress value={metrics.confidence * 100} className="mt-1" />
            <p className="text-xs text-muted-foreground mt-1">
              {(metrics.confidence * 100).toFixed(0)}% confidence
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}