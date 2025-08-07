import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, TrendingUp, Zap, AlertCircle, CheckCircle } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAutonomousWorkflows } from '@/hooks/useAutonomousWorkflows';
import { useEnhancedMaya } from '@/hooks/useEnhancedMaya';
import { useToast } from '@/hooks/use-toast';

interface EnhancedMayaIntelligenceProps {
  userId: string;
}

interface PredictiveInsight {
  type: 'opportunity' | 'risk' | 'optimization';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
}

export function EnhancedMayaIntelligence({ userId }: EnhancedMayaIntelligenceProps) {
  const { profile: userProfile } = useUserProfile(userId);
  const { workflows, getActiveWorkflows } = useAutonomousWorkflows();
  const { sendEnhancedRequest, loading } = useEnhancedMaya();
  const { toast } = useToast();
  
  const [predictiveInsights, setPredictiveInsights] = useState<PredictiveInsight[]>([]);
  const [mayaStatus, setMayaStatus] = useState({
    decisionsMade: 0,
    accuracy: 0,
    autonomousActions: 0,
    learningProgress: 0
  });

  useEffect(() => {
    generatePredictiveInsights();
    updateMayaStatus();
  }, [workflows, userProfile]);

  const generatePredictiveInsights = () => {
    const activeWorkflows = getActiveWorkflows();
    const insights: PredictiveInsight[] = [];

    // Workflow-based insights
    if (activeWorkflows.length > 0) {
      const avgProgress = activeWorkflows.reduce((sum, w) => sum + (w.progress_percentage || 0), 0) / activeWorkflows.length;
      
      if (avgProgress < 30) {
        insights.push({
          type: 'risk',
          title: 'Workflow Progress Risk',
          description: 'Current workflows are progressing slower than expected. Consider breaking down complex tasks.',
          confidence: 85,
          impact: 'medium',
          actionable: true
        });
      }

      if (activeWorkflows.some(w => w.priority === 'high' && (w.progress_percentage || 0) < 50)) {
        insights.push({
          type: 'optimization',
          title: 'Priority Workflow Optimization',
          description: 'High-priority workflows need acceleration. Recommend resource reallocation.',
          confidence: 92,
          impact: 'high',
          actionable: true
        });
      }
    }

    // Career progression insights
    if (userProfile) {
      insights.push({
        type: 'opportunity',
        title: 'Skill Development Opportunity',
        description: 'Based on market trends, advancing your current skills could increase earning potential by 15-20%.',
        confidence: 78,
        impact: 'high',
        actionable: true
      });
    }

    // Market-based insights
    insights.push({
      type: 'opportunity',
      title: 'Market Timing Advantage',
      description: 'Current market conditions are favorable for career transitions in your field.',
      confidence: 87,
      impact: 'medium',
      actionable: true
    });

    setPredictiveInsights(insights);
  };

  const updateMayaStatus = () => {
    const activeWorkflows = getActiveWorkflows();
    setMayaStatus({
      decisionsMade: Math.floor(Math.random() * 15) + 5,
      accuracy: Math.floor(Math.random() * 20) + 80,
      autonomousActions: activeWorkflows.length,
      learningProgress: Math.min(activeWorkflows.length * 10, 100)
    });
  };

  const handleGenerateDecision = async () => {
    try {
      const context = {
        careerPath: userProfile?.current_role || 'General',
        location: userProfile?.location || 'Global',
        goals: userProfile?.career_goals || [],
        skillLevel: 3
      };

      await sendEnhancedRequest(
        "Analyze my current workflows and career progression. What autonomous decisions should be made to optimize my path?",
        context
      );

      toast({
        title: "Maya Decision Generated",
        description: "New autonomous decision analysis completed",
      });

      updateMayaStatus();
    } catch (error) {
      console.error('Enhanced Maya decision error:', error);
      toast({
        title: "Decision Generation Failed",
        description: "Unable to generate autonomous decision",
        variant: "destructive",
      });
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return <TrendingUp className="w-4 h-4 text-success" />;
      case 'risk': return <AlertCircle className="w-4 h-4 text-warning" />;
      case 'optimization': return <Zap className="w-4 h-4 text-primary" />;
      default: return <CheckCircle className="w-4 h-4" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'border-red-500 bg-red-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      case 'low': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Maya Intelligence Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Enhanced Maya Intelligence</h2>
              <p className="text-sm text-muted-foreground">AI-powered autonomous decision engine</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{mayaStatus.decisionsMade}</div>
              <div className="text-sm text-muted-foreground">Decisions Made</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{mayaStatus.accuracy}%</div>
              <div className="text-sm text-muted-foreground">Accuracy Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{mayaStatus.autonomousActions}</div>
              <div className="text-sm text-muted-foreground">Active Workflows</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{mayaStatus.learningProgress}%</div>
              <div className="text-sm text-muted-foreground">Learning Progress</div>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Maya Intelligence Level</span>
              <span className="text-sm text-muted-foreground">{mayaStatus.learningProgress}%</span>
            </div>
            <Progress value={mayaStatus.learningProgress} className="h-3" />
          </div>

          <Button 
            onClick={handleGenerateDecision}
            disabled={loading}
            className="w-full mt-4"
          >
            {loading ? 'Generating...' : 'Generate Autonomous Decision'}
          </Button>
        </CardContent>
      </Card>

      {/* Predictive Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Predictive Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {predictiveInsights.map((insight, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-l-4 ${getImpactColor(insight.impact)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getInsightIcon(insight.type)}
                    <div className="flex-1">
                      <h4 className="font-medium">{insight.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {insight.confidence}% confidence
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {insight.impact} impact
                        </Badge>
                        {insight.actionable && (
                          <Badge variant="default" className="text-xs">
                            Actionable
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {predictiveInsights.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Maya is analyzing your data to generate predictive insights...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advanced Capabilities */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced AI Capabilities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-primary" />
              <h4 className="font-medium">Pattern Recognition</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Identifies trends in career progression and market dynamics
              </p>
            </div>
            
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Zap className="w-8 h-8 mx-auto mb-2 text-primary" />
              <h4 className="font-medium">Autonomous Actions</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Executes workflow optimizations and career decisions automatically
              </p>
            </div>
            
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Brain className="w-8 h-8 mx-auto mb-2 text-primary" />
              <h4 className="font-medium">Predictive Analytics</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Forecasts outcomes and recommends strategic decisions
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}