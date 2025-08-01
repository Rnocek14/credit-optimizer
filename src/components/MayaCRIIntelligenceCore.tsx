/**
 * Phase 7: Maya CRI Intelligence Core
 * Central dashboard for Maya + CRI integration
 */

import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain,
  Target,
  TrendingUp,
  Lightbulb,
  Star,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  BarChart3
} from 'lucide-react';
import { useMayaCRIIntegration } from '@/hooks/useMayaCRIIntegration';
import { useCareerReadiness } from '@/hooks/useCareerReadiness';
import { useCRIGoals } from '@/hooks/useCRIGoals';
import { toast } from 'sonner';

interface MayaCRIIntelligenceCoreProps {
  userId?: string;
  autoGenerate?: boolean;
}

export function MayaCRIIntelligenceCore({ userId, autoGenerate = true }: MayaCRIIntelligenceCoreProps) {
  const { criScore } = useCareerReadiness({ userId });
  const { targetCRI } = useCRIGoals(userId);
  
  const {
    insights,
    trajectory,
    generateCRIGuidance,
    analyzeCRISkillGaps,
    generateCareerTrajectory,
    createCRIWorkflow,
    isGeneratingGuidance,
    isCreatingWorkflow,
    hasInsights,
    highPriorityInsights,
    actionableInsights
  } = useMayaCRIIntegration(userId);

  // Auto-generate insights on component mount
  useEffect(() => {
    if (autoGenerate && userId && criScore) {
      const timer = setTimeout(() => {
        generateCRIGuidance();
        generateCareerTrajectory();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [autoGenerate, userId, criScore, generateCRIGuidance, generateCareerTrajectory]);

  const currentCRI = criScore?.overall || 0;
  const criGap = targetCRI - currentCRI;
  const progressPercentage = (currentCRI / targetCRI) * 100;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'skill_gap': return <Target className="h-4 w-4" />;
      case 'market_trend': return <TrendingUp className="h-4 w-4" />;
      case 'career_advice': return <Lightbulb className="h-4 w-4" />;
      case 'learning_path': return <BarChart3 className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with CRI Status */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Maya CRI Intelligence Core
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{currentCRI}</div>
              <div className="text-sm text-muted-foreground">Current CRI</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{targetCRI}</div>
              <div className="text-sm text-muted-foreground">Target CRI</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${criGap > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {criGap > 0 ? criGap : 0}
              </div>
              <div className="text-sm text-muted-foreground">Points to Goal</div>
            </div>
          </div>
          
          <Progress value={Math.min(progressPercentage, 100)} className="h-3" />
          
          <div className="flex justify-center gap-2">
            <Button 
              onClick={() => generateCRIGuidance()}
              disabled={isGeneratingGuidance}
              size="sm"
              variant="outline"
            >
              <Brain className="h-4 w-4 mr-2" />
              {isGeneratingGuidance ? 'Analyzing...' : 'Get Maya Guidance'}
            </Button>
            <Button 
              onClick={() => analyzeCRISkillGaps()}
              size="sm"
              variant="outline"
            >
              <Target className="h-4 w-4 mr-2" />
              Analyze Gaps
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Career Trajectory Prediction */}
      {trajectory && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Career Trajectory Prediction
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">Time to Target</span>
                </div>
                <div className="text-2xl font-bold text-blue-600">{trajectory.timeToTarget}</div>
                <div className="text-sm text-muted-foreground">
                  Based on current progress rate
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-4 w-4 text-purple-500" />
                  <span className="font-medium">Confidence</span>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {(trajectory.confidenceInterval * 100).toFixed(0)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  Prediction accuracy
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Recommended Priority Actions</h4>
              <div className="space-y-2">
                {trajectory.recommendedActions.map((action, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{action}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button 
              onClick={() => createCRIWorkflow({ targetRole: 'Career advancement', priority: 'high' })}
              disabled={isCreatingWorkflow}
              className="w-full"
            >
              <Zap className="h-4 w-4 mr-2" />
              {isCreatingWorkflow ? 'Creating...' : 'Create Smart Workflow'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Maya Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Maya CRI Insights
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">
                {highPriorityInsights.length} High Priority
              </Badge>
              <Badge variant="outline">
                {actionableInsights.length} Actionable
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasInsights ? (
            <div className="space-y-4">
              {insights.slice(0, 5).map((insight, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getInsightIcon(insight.type)}
                      <span className="font-medium">{insight.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        className={`${getPriorityColor(insight.priority)} text-white text-xs`}
                      >
                        {insight.priority}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {(insight.confidence * 100).toFixed(0)}% confident
                      </Badge>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {insight.message}
                  </p>
                  
                  {insight.actionable && insight.suggestedAction && (
                    <div className="flex items-center gap-2 pt-2">
                      <Button size="sm" variant="outline">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {insight.suggestedAction}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Maya is analyzing your CRI data...</p>
              <p className="text-sm">Insights will appear here shortly</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-500" />
            Maya CRI Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button 
              onClick={() => analyzeCRISkillGaps()}
              variant="outline" 
              className="flex items-center gap-2"
            >
              <Target className="h-4 w-4" />
              Analyze Skill Gaps
            </Button>
            <Button 
              onClick={() => generateCareerTrajectory()}
              variant="outline" 
              className="flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              Update Trajectory
            </Button>
            <Button 
              onClick={() => generateCRIGuidance()}
              variant="outline" 
              className="flex items-center gap-2"
            >
              <Lightbulb className="h-4 w-4" />
              Get Maya Advice
            </Button>
            <Button 
              onClick={() => {
                toast.success('Maya is monitoring your CRI progress in real-time');
              }}
              variant="outline" 
              className="flex items-center gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              CRI Monitoring
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}