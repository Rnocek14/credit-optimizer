import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Bot, Calendar, TrendingUp, Clock, Target, AlertTriangle, CheckCircle } from 'lucide-react';
import { useEnhancedMaya } from '@/hooks/useEnhancedMaya';
import { useUserProfile } from '@/hooks/useUserProfile';

interface MayaTimelineInsightsProps {
  userId: string;
  milestones: any[];
  targetCareer: string;
  overallProgress: number;
}

export function MayaTimelineInsights({ 
  userId, 
  milestones, 
  targetCareer, 
  overallProgress 
}: MayaTimelineInsightsProps) {
  const { profile: userProfile } = useUserProfile(userId);
  const { sendEnhancedRequest, loading } = useEnhancedMaya();
  const [insights, setInsights] = useState<any>(null);

  useEffect(() => {
    const generateTimelineInsights = async () => {
      if (!userProfile || !milestones.length) return;

      const completedMilestones = milestones.filter(m => m.status === 'completed');
      const inProgressMilestones = milestones.filter(m => m.status === 'in_progress');
      const pendingMilestones = milestones.filter(m => m.status === 'pending');

      const context = {
        careerPath: targetCareer,
        skillLevel: userProfile.experience_level === 'entry' ? 1 : userProfile.experience_level === 'mid' ? 2 : 3,
        goals: [targetCareer]
      };

      const prompt = `Analyze my learning timeline progress:
        - Target Career: ${targetCareer}
        - Overall Progress: ${overallProgress}%
        - Completed Milestones: ${completedMilestones.length}
        - In Progress: ${inProgressMilestones.length}
        - Pending: ${pendingMilestones.length}
        
        Provide timeline insights, milestone recommendations, and predictive completion estimates.`;

      const response = await sendEnhancedRequest(prompt, context);
      if (response) {
        setInsights(response);
      }
    };

    generateTimelineInsights();
  }, [userProfile, milestones, targetCareer, overallProgress, sendEnhancedRequest]);

  const completedCount = milestones.filter(m => m.status === 'completed').length;
  const inProgressCount = milestones.filter(m => m.status === 'in_progress').length;
  const pendingCount = milestones.filter(m => m.status === 'pending').length;
  const totalMilestones = milestones.length;

  const nextMilestone = milestones.find(m => m.status === 'in_progress') || 
                      milestones.find(m => m.status === 'pending');

  const estimatedCompletion = new Date();
  estimatedCompletion.setMonth(estimatedCompletion.getMonth() + Math.ceil((100 - overallProgress) / 15));

  return (
    <div className="space-y-4">
      {/* Maya Timeline Analysis Header */}
      <Card className="bg-gradient-to-r from-primary/10 via-accent/5 to-secondary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Maya's Timeline Insights</h3>
              <p className="text-sm text-muted-foreground">AI-powered progress analysis and recommendations</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {insights?.response || "Analyzing your timeline progress and generating personalized insights..."}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Progress Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Progress Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-muted-foreground">{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded">
                <div className="text-lg font-bold text-green-700 dark:text-green-300">{completedCount}</div>
                <div className="text-xs text-green-600 dark:text-green-400">Completed</div>
              </div>
              <div className="p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded">
                <div className="text-lg font-bold text-yellow-700 dark:text-yellow-300">{inProgressCount}</div>
                <div className="text-xs text-yellow-600 dark:text-yellow-400">In Progress</div>
              </div>
              <div className="p-2 bg-gray-50 dark:bg-gray-950/20 rounded">
                <div className="text-lg font-bold text-gray-700 dark:text-gray-300">{pendingCount}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Pending</div>
              </div>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Projected Completion</span>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {estimatedCompletion.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps & Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-4 h-4 text-purple-600" />
              Maya's Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {nextMilestone && (
              <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                      Focus on: {nextMilestone.title}
                    </p>
                    <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                      {nextMilestone.description}
                    </p>
                    <Badge variant="outline" className="mt-2 text-xs">
                      {nextMilestone.priority} priority
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {insights?.autonomousActions?.slice(0, 2).map((action: any, index: number) => (
              <div key={index} className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-900 dark:text-green-100">
                      {action.action || 'Optimization Suggestion'}
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                      {action.reasoning || 'Maya suggests this action to accelerate your progress'}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {overallProgress < 50 && (
              <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                      Timeline Optimization Available
                    </p>
                    <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                      Maya has identified opportunities to accelerate your learning path
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Insights */}
      {insights?.requestAnalysis?.insights && insights.requestAnalysis.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detailed Timeline Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {insights.requestAnalysis.insights.slice(0, 4).map((insight: any, index: number) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {insight.type || 'Insight'}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium">{insight.title || 'Timeline Insight'}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {insight.message || 'Maya has identified a pattern in your learning progress'}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}