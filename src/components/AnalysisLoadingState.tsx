import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  TrendingUp, 
  BarChart3, 
  Zap, 
  MapPin,
  Clock,
  Target
} from 'lucide-react';

interface AnalysisLoadingStateProps {
  careerPath?: string;
  location?: string;
  stage?: 'initializing' | 'analyzing' | 'processing' | 'finalizing';
  progress?: number;
}

export const AnalysisLoadingState: React.FC<AnalysisLoadingStateProps> = ({
  careerPath,
  location,
  stage = 'analyzing',
  progress = 45
}) => {
  const getStageInfo = (currentStage: string) => {
    switch (currentStage) {
      case 'initializing':
        return {
          title: 'Initializing Analysis',
          description: 'Setting up market intelligence systems...',
          icon: <Brain className="h-5 w-5 text-blue-500" />,
          color: 'bg-blue-50 border-blue-200'
        };
      case 'analyzing':
        return {
          title: 'Analyzing Market Data',
          description: 'Processing career market trends and opportunities...',
          icon: <BarChart3 className="h-5 w-5 text-emerald-500" />,
          color: 'bg-emerald-50 border-emerald-200'
        };
      case 'processing':
        return {
          title: 'Processing Insights',
          description: 'Generating AI-powered recommendations...',
          icon: <Zap className="h-5 w-5 text-primary" />,
          color: 'bg-primary-light border-primary/20'
        };
      case 'finalizing':
        return {
          title: 'Finalizing Results',
          description: 'Preparing comprehensive analysis...',
          icon: <Target className="h-5 w-5 text-amber-500" />,
          color: 'bg-amber-50 border-amber-200'
        };
      default:
        return {
          title: 'Processing',
          description: 'Working on your analysis...',
          icon: <Brain className="h-5 w-5 text-primary" />,
          color: 'bg-primary/5 border-primary/20'
        };
    }
  };

  const stageInfo = getStageInfo(stage);

  return (
    <div className="space-y-6">
      {/* Main Loading Card */}
      <Card className={`border-2 ${stageInfo.color}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {stageInfo.icon}
            {stageInfo.title}
          </CardTitle>
          {careerPath && location && (
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="px-3 py-1">
                <MapPin className="h-3 w-3 mr-1" />
                {careerPath} in {location}
              </Badge>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {stageInfo.description}
          </p>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Processing Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-card/50">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                progress >= 25 ? 'bg-emerald-100 text-emerald-600' : 'bg-muted text-muted-foreground'
              }`}>
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Market Trends</p>
                <p className="text-xs text-muted-foreground">
                  {progress >= 25 ? 'Complete' : 'Processing...'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 border rounded-lg bg-card/50">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                progress >= 60 ? 'bg-blue-100 text-blue-600' : 'bg-muted text-muted-foreground'
              }`}>
                <BarChart3 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Data Analysis</p>
                <p className="text-xs text-muted-foreground">
                  {progress >= 60 ? 'Complete' : 'Processing...'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 border rounded-lg bg-card/50">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                progress >= 90 ? 'bg-primary-light text-primary' : 'bg-muted text-muted-foreground'
              }`}>
                <Brain className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">AI Insights</p>
                <p className="text-xs text-muted-foreground">
                  {progress >= 90 ? 'Complete' : 'Processing...'}
                </p>
              </div>
            </div>
          </div>

          {/* Estimated Time */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
            <Clock className="h-4 w-4" />
            <span>Estimated completion: 30-45 seconds</span>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Placeholders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="opacity-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-6 bg-muted rounded animate-pulse w-16" />
                </div>
                <div className="h-8 w-8 bg-muted rounded animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};