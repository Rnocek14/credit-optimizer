import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Zap, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  Target,
  BarChart3,
  Eye
} from 'lucide-react';

interface AnalysisStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  result?: any;
  icon: React.ReactNode;
}

interface IntelligentActionBridgeProps {
  isRunning: boolean;
  careerPath?: string;
  location?: string;
  onComplete: (results: any) => void;
  selectedTab?: string;
}

export const IntelligentActionBridge: React.FC<IntelligentActionBridgeProps> = ({
  isRunning,
  careerPath,
  location,
  onComplete,
  selectedTab
}) => {
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([
    {
      id: 'market-trends',
      title: 'Market Trend Analysis',
      description: 'Analyzing current market conditions and growth patterns',
      status: 'pending',
      icon: <TrendingUp className="h-4 w-4" />
    },
    {
      id: 'historical-data',
      title: 'Historical Trends',
      description: 'Gathering 6 months of historical market data',
      status: 'pending',
      icon: <BarChart3 className="h-4 w-4" />
    },
    {
      id: 'real-time-jobs',
      title: 'Real-time Job Data',
      description: 'Fetching live job postings and salary information',
      status: 'pending',
      icon: <Target className="h-4 w-4" />
    },
    {
      id: 'pattern-analysis',
      title: 'Pattern Recognition',
      description: 'Identifying market patterns and opportunities',
      status: 'pending',
      icon: <Eye className="h-4 w-4" />
    }
  ]);

  const getProgress = () => {
    const completed = analysisSteps.filter(step => step.status === 'complete').length;
    return (completed / analysisSteps.length) * 100;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'text-emerald-500';
      case 'running':
        return 'text-blue-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'error':
        return <div className="h-4 w-4 rounded-full bg-red-500" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-muted" />;
    }
  };

  if (!isRunning) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-blue-500/5">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Intelligent Market Analysis</CardTitle>
        </div>
        <CardDescription>
          Running comprehensive analysis for {careerPath} in {location}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Analysis Progress</span>
            <span>{Math.round(getProgress())}%</span>
          </div>
          <Progress value={getProgress()} className="h-2" />
        </div>

        <div className="space-y-3">
          {analysisSteps.map((step) => (
            <div
              key={step.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card/30"
            >
              <div className="flex items-center gap-2">
                {getStatusIcon(step.status)}
                {step.icon}
              </div>
              <div className="flex-1">
                <div className={`font-medium text-sm ${getStatusColor(step.status)}`}>
                  {step.title}
                </div>
                <div className="text-xs text-muted-foreground">
                  {step.description}
                </div>
              </div>
              {step.status === 'complete' && (
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Done
                </Badge>
              )}
            </div>
          ))}
        </div>

        {getProgress() === 100 && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-medium text-sm">Analysis Complete!</span>
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              All market intelligence data has been gathered and is ready for review.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};