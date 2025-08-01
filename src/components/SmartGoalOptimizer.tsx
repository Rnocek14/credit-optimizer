import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  TrendingUp, 
  Target, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  ArrowRight,
  Zap,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SmartGoalOptimizerProps {
  goalId: string;
  userId: string;
  goal: any;
  onOptimizationComplete?: (optimization: any) => void;
}

export function SmartGoalOptimizer({ goalId, userId, goal, onOptimizationComplete }: SmartGoalOptimizerProps) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimization, setOptimization] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  const runOptimization = async () => {
    setIsOptimizing(true);
    try {
      console.log('🎯 Running goal optimization...');
      
      const { data, error } = await supabase.functions.invoke('intelligent-goal-optimizer', {
        body: {
          goalId,
          userId,
          marketContext: {
            location: 'United States',
            industry: 'Technology',
            experienceLevel: 'intermediate'
          }
        }
      });

      if (error) throw error;

      if (data.success) {
        setOptimization(data.optimization);
        onOptimizationComplete?.(data.optimization);
        
        toast({
          title: "Goal Optimized Successfully",
          description: "AI analysis complete with actionable recommendations.",
        });
      } else {
        throw new Error(data.error || 'Optimization failed');
      }
    } catch (error) {
      console.error('Optimization error:', error);
      toast({
        title: "Optimization Failed",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSuccessColor = (probability: number) => {
    if (probability >= 0.8) return 'bg-green-500';
    if (probability >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (!optimization) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Brain className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>Smart Goal Optimizer</CardTitle>
          <CardDescription>
            Get AI-powered insights and optimization recommendations for your career goal
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button 
            onClick={runOptimization} 
            disabled={isOptimizing}
            size="lg"
            className="w-full"
          >
            {isOptimizing ? (
              <>
                <Zap className="w-4 h-4 mr-2 animate-spin" />
                Analyzing Goal...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                Optimize Goal with AI
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Optimization Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <CardTitle>Goal Intelligence Dashboard</CardTitle>
          </div>
          <CardDescription>
            AI-powered analysis and optimization recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className={`text-2xl font-bold ${getScoreColor(optimization.marketScore)}`}>
                {optimization.marketScore}%
              </div>
              <div className="text-sm text-muted-foreground">Market Score</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getScoreColor(100 - optimization.difficultyScore)}`}>
                {Math.round(100 - optimization.difficultyScore)}%
              </div>
              <div className="text-sm text-muted-foreground">Feasibility</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getScoreColor(optimization.successProbability * 100)}`}>
                {Math.round(optimization.successProbability * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {optimization.recommendedTimelineWeeks}w
              </div>
              <div className="text-sm text-muted-foreground">Timeline</div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Market Favorability</span>
                <span className={`text-sm ${getScoreColor(optimization.marketScore)}`}>
                  {optimization.marketScore}%
                </span>
              </div>
              <Progress value={optimization.marketScore} />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Success Probability</span>
                <span className={`text-sm ${getScoreColor(optimization.successProbability * 100)}`}>
                  {Math.round(optimization.successProbability * 100)}%
                </span>
              </div>
              <Progress value={optimization.successProbability * 100} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analysis Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="market">Market</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                AI Insights & Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  {optimization.aiInsights.primaryRecommendation}
                </AlertDescription>
              </Alert>

              <div>
                <h4 className="font-medium mb-2">Actionable Steps</h4>
                <ul className="space-y-2">
                  {optimization.aiInsights.actionableSteps.map((step: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                      <span className="text-sm">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2 text-green-600">Opportunities</h4>
                  <ul className="space-y-1">
                    {optimization.aiInsights.opportunities.map((opp: string, index: number) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <TrendingUp className="w-3 h-3 mt-1 text-green-500 flex-shrink-0" />
                        {opp}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2 text-yellow-600">Risk Factors</h4>
                  <ul className="space-y-1">
                    {optimization.aiInsights.riskFactors.map((risk: string, index: number) => (
                      <li key={index} className="text-sm flex items-start gap-2">
                        <AlertTriangle className="w-3 h-3 mt-1 text-yellow-500 flex-shrink-0" />
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Skill Gap Analysis</CardTitle>
              <CardDescription>
                Critical skills needed for success in your target role
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {optimization.skillGapAnalysis.criticalSkills.map((skill: string, index: number) => {
                  const importance = optimization.skillGapAnalysis.skillImportance[skill] || 0;
                  const marketDemand = optimization.skillGapAnalysis.marketDemandBySkill[skill] || 0;
                  
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{skill}</span>
                        <div className="flex gap-2">
                          <Badge variant="secondary">
                            {Math.round(importance * 100)}% Important
                          </Badge>
                          <Badge variant="outline">
                            {Math.round(marketDemand * 100)}% Demand
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Importance</div>
                          <Progress value={importance * 100} />
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Market Demand</div>
                          <Progress value={marketDemand * 100} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="market" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Market Intelligence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 border rounded-lg">
                  <div className="font-semibold text-lg">
                    {optimization.marketTrends.demandTrend}
                  </div>
                  <div className="text-sm text-muted-foreground">Demand Trend</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="font-semibold text-lg">
                    {optimization.marketTrends.salaryTrend}
                  </div>
                  <div className="text-sm text-muted-foreground">Salary Trend</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="font-semibold text-lg">
                    {optimization.marketTrends.competitionLevel}
                  </div>
                  <div className="text-sm text-muted-foreground">Competition</div>
                </div>
              </div>

              {optimization.marketTrends.emergingSkills && optimization.marketTrends.emergingSkills.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Emerging Skills in High Demand</h4>
                  <div className="flex flex-wrap gap-2">
                    {optimization.marketTrends.emergingSkills.map((skill: string, index: number) => (
                      <Badge key={index} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Autonomous Actions Available
              </CardTitle>
              <CardDescription>
                AI-recommended optimizations that can be applied automatically
              </CardDescription>
            </CardHeader>
            <CardContent>
              {optimization.autonomousActions && optimization.autonomousActions.length > 0 ? (
                <div className="space-y-4">
                  {optimization.autonomousActions.map((action: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{action.type.replace('_', ' ')}</Badge>
                          <div className="text-sm text-muted-foreground">
                            {Math.round(action.confidence * 100)}% confidence
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          Apply
                        </Button>
                      </div>
                      <p className="text-sm mb-2">{action.description}</p>
                      <p className="text-xs text-muted-foreground">{action.rationale}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No autonomous actions recommended at this time.</p>
                  <p className="text-sm">Your goal is already well-optimized!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="text-center">
        <Button onClick={runOptimization} disabled={isOptimizing} variant="outline">
          <Brain className="w-4 h-4 mr-2" />
          Re-analyze Goal
        </Button>
      </div>
    </div>
  );
}