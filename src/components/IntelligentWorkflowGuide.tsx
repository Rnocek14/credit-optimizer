import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  Circle, 
  ArrowRight, 
  Lightbulb, 
  Target, 
  TrendingUp,
  Brain,
  ChevronRight
} from 'lucide-react';

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  available: boolean;
  action?: () => void;
  insight?: string;
}

interface IntelligentWorkflowGuideProps {
  selectedCareerPath: { id: string; title: string } | null;
  selectedLocation: { id: string; label: string; value: string; emoji: string } | null;
  analysis: any;
  onNavigateToTab: (tab: string) => void;
  onAnalysisRequest: () => void;
}

export const IntelligentWorkflowGuide: React.FC<IntelligentWorkflowGuideProps> = ({
  selectedCareerPath,
  selectedLocation,
  analysis,
  onNavigateToTab,
  onAnalysisRequest
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  const generateWorkflowSteps = (): WorkflowStep[] => {
    const hasSelections = selectedCareerPath && selectedLocation;
    const hasAnalysis = analysis !== null;

    return [
      {
        id: 'setup',
        title: 'Select Career & Location',
        description: 'Choose your target career path and preferred location',
        completed: !!hasSelections,
        available: true,
        insight: hasSelections 
          ? `Great choice! ${selectedCareerPath.title} in ${selectedLocation.label} shows strong potential.`
          : 'Start by selecting your career path and location to unlock personalized insights.'
      },
      {
        id: 'analysis',
        title: 'Run Market Analysis',
        description: 'Get AI-powered market intelligence for your selections',
        completed: hasAnalysis,
        available: !!hasSelections,
        action: onAnalysisRequest,
        insight: hasAnalysis
          ? `Analysis complete! ${analysis.marketTrends?.aiInsights?.confidence > 80 ? 'High confidence' : 'Moderate confidence'} insights generated.`
          : hasSelections 
            ? 'Ready to analyze market trends for your selections.'
            : 'Complete step 1 to unlock market analysis.'
      },
      {
        id: 'explore',
        title: 'Explore Historical Data',
        description: 'Review trends and patterns over time',
        completed: false, // Will be dynamic based on user interaction
        available: hasAnalysis,
        action: () => onNavigateToTab('analysis'),
        insight: hasAnalysis
          ? 'Dive deep into historical trends to identify growth patterns and opportunities.'
          : 'Complete market analysis to unlock historical trend exploration.'
      },
      {
        id: 'forecast',
        title: 'Review Forecasts',
        description: 'Examine future market predictions and scenarios',
        completed: false,
        available: hasAnalysis,
        action: () => onNavigateToTab('analysis'),
        insight: hasAnalysis
          ? 'Understand future market projections to make informed career decisions.'
          : 'Market analysis provides the foundation for accurate forecasting.'
      },
      {
        id: 'action',
        title: 'Set Alerts & Export',
        description: 'Monitor changes and export your insights',
        completed: false,
        available: hasAnalysis,
        action: () => onNavigateToTab('alerts'),
        insight: hasAnalysis
          ? 'Stay informed with automated alerts and export your market intelligence report.'
          : 'Complete your analysis to set up monitoring and reporting.'
      }
    ];
  };

  const [steps, setSteps] = useState<WorkflowStep[]>(generateWorkflowSteps());

  useEffect(() => {
    setSteps(generateWorkflowSteps());
    
    // Update current step based on completion
    const newCurrentStep = steps.findIndex(step => !step.completed);
    if (newCurrentStep !== -1) {
      setCurrentStep(newCurrentStep);
    }
  }, [selectedCareerPath, selectedLocation, analysis]);

  const completedSteps = steps.filter(step => step.completed).length;
  const progressPercentage = (completedSteps / steps.length) * 100;

  const handleStepClick = (step: WorkflowStep, index: number) => {
    if (step.available && step.action) {
      step.action();
    }
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Intelligence Workflow
        </CardTitle>
        <CardDescription>
          Follow this guided workflow to maximize your market insights
        </CardDescription>
        <div className="flex items-center gap-2 mt-2">
          <Progress value={progressPercentage} className="flex-1" />
          <Badge variant="secondary">
            {completedSteps}/{steps.length} Complete
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map((step, index) => (
          <div 
            key={step.id}
            className={`p-4 rounded-lg border transition-all ${
              step.completed 
                ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800' 
                : step.available 
                  ? 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900' 
                  : 'bg-muted border-muted opacity-60'
            }`}
            onClick={() => handleStepClick(step, index)}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                {step.completed ? (
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                ) : step.available ? (
                  <Circle className="h-5 w-5 text-blue-600" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className={`font-medium ${
                    step.completed 
                      ? 'text-emerald-900 dark:text-emerald-100' 
                      : step.available 
                        ? 'text-blue-900 dark:text-blue-100' 
                        : 'text-muted-foreground'
                  }`}>
                    {step.title}
                  </h4>
                  {step.available && step.action && !step.completed && (
                    <ChevronRight className="h-4 w-4 text-blue-600" />
                  )}
                </div>
                
                <p className={`text-sm mt-1 ${
                  step.completed 
                    ? 'text-emerald-700 dark:text-emerald-300' 
                    : step.available 
                      ? 'text-blue-700 dark:text-blue-300' 
                      : 'text-muted-foreground'
                }`}>
                  {step.description}
                </p>
                
                {step.insight && (
                  <div className={`mt-2 p-2 rounded text-xs flex items-start gap-2 ${
                    step.completed 
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' 
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  }`}>
                    <Lightbulb className="h-3 w-3 flex-shrink-0 mt-0.5" />
                    <span>{step.insight}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {/* Next Action Suggestion */}
        {currentStep < steps.length && (
          <div className="mt-6 p-4 bg-gradient-to-r from-primary/10 to-blue-500/10 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-primary">Next Recommended Action</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {steps[currentStep]?.title} - {steps[currentStep]?.description}
                </p>
              </div>
              {steps[currentStep]?.action && (
                <Button 
                  size="sm" 
                  onClick={() => handleStepClick(steps[currentStep], currentStep)}
                  disabled={!steps[currentStep]?.available}
                >
                  {steps[currentStep]?.id === 'analysis' ? 'Run Analysis' : 'Continue'}
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};