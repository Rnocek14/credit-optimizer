import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target, Brain, BookOpen, Award, Clock, TrendingUp, Plus, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { NextSmartStep } from './NextSmartStep';

interface GoalTrackerProps {
  userId: string;
}

export function GoalTracker({ userId }: GoalTrackerProps) {
  const [goals, setGoals] = useState<any[]>([]);
  const [learningPlans, setLearningPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      fetchGoalsAndPlans();
    }
  }, [userId]);

  const fetchGoalsAndPlans = async () => {
    try {
      setLoading(true);
      
      const { data: goalsData, error: goalsError } = await supabase
        .from('career_goals')
        .select(`
          *,
          goal_progress(*)
        `)
        .eq('user_id', userId)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (goalsError) throw goalsError;

      // Fetch goal progress separately
      const { data: progressData } = await supabase
        .from('goal_progress')
        .select('*')
        .in('goal_id', goalsData?.map(g => g.id) || []);

      // Calculate progress for each goal
      const goalsWithProgress = goalsData?.map(goal => {
        const progressEntries = progressData?.filter(p => p.goal_id === goal.id) || [];
        const completedEntries = progressEntries.filter((p: any) => p.completed);
        const progressPercentage = progressEntries.length > 0 
          ? Math.round((completedEntries.length / progressEntries.length) * 100)
          : 0;
        
        return {
          ...goal,
          calculated_progress: progressPercentage
        };
      }) || [];

      setGoals(goalsWithProgress);

      // Mock learning plans data (would come from generate-learning-plan function)
      setLearningPlans([]);
      
    } catch (error) {
      console.error('Error fetching goals and plans:', error);
      toast({
        title: "Error",
        description: "Failed to load your goals and learning plans",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateLearningPlan = async (goalId: string) => {
    try {
      const { data: planResult } = await supabase.functions.invoke('generate-learning-plan', {
        body: { 
          user_id: userId,
          goal_id: goalId,
          context: {
            experience_level: 'beginner',
            time_budget_hours_per_week: 10
          }
        }
      });

      if (planResult?.success) {
        toast({
          title: "Learning Plan Generated",
          description: "Your personalized learning plan is ready!",
        });
        
        // Navigate to learning plan view
        window.location.href = `/learning-plan/${goalId}`;
      }
    } catch (error) {
      console.error('Error generating learning plan:', error);
      toast({
        title: "Error",
        description: "Failed to generate learning plan",
        variant: "destructive",
      });
    }
  };

  const getPriorityBadge = (score: number) => {
    if (score >= 80) return { variant: 'destructive' as const, label: 'High' };
    if (score >= 60) return { variant: 'default' as const, label: 'Medium' };
    return { variant: 'secondary' as const, label: 'Low' };
  };

  const getTimeUrgency = (targetDate: string | null) => {
    if (!targetDate) return null;
    
    const days = Math.floor(
      (new Date(targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (days < 30) return { label: 'Due Soon', color: 'destructive' };
    if (days < 90) return { label: 'This Quarter', color: 'default' };
    return { label: 'Long-term', color: 'secondary' };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map(i => (
              <div key={i} className="h-48 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Goal Tracker
          </h1>
          <p className="text-muted-foreground">
            Track your progress and manage your learning journey
          </p>
        </div>
        <Button onClick={() => window.location.href = '/planner'}>
          <Plus className="h-4 w-4 mr-2" />
          Generate New Goals
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="goals">Active Goals</TabsTrigger>
          <TabsTrigger value="plans">Learning Plans</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <NextSmartStep userId={userId} />
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Progress Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{goals.length}</div>
                    <div className="text-sm text-muted-foreground">Active Goals</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {goals.filter(g => g.calculated_progress >= 100).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Completed</div>
                  </div>
                </div>
                
                {goals.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Overall Progress</span>
                      <span>
                        {Math.round(
                          goals.reduce((sum, g) => sum + g.calculated_progress, 0) / goals.length
                        )}%
                      </span>
                    </div>
                    <Progress 
                      value={goals.reduce((sum, g) => sum + g.calculated_progress, 0) / goals.length}
                      className="h-2"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="goals" className="space-y-4">
          {goals.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Goals Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start by generating some smart goals to track your progress
                </p>
                <Button onClick={() => window.location.href = '/planner'}>
                  <Brain className="h-4 w-4 mr-2" />
                  Generate Smart Goals
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {goals.map((goal) => {
                const priority = getPriorityBadge(goal.priority_score || 50);
                const urgency = getTimeUrgency(goal.target_date);
                
                return (
                  <Card key={goal.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{goal.title}</CardTitle>
                          {goal.description && (
                            <p className="text-muted-foreground text-sm mt-1">
                              {goal.description}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={priority.variant}>{priority.label}</Badge>
                          {urgency && (
                            <Badge variant={urgency.color as any}>
                              <Clock className="h-3 w-3 mr-1" />
                              {urgency.label}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {goal.target_role && (
                        <div className="flex items-center gap-2 text-sm">
                          <Target className="h-4 w-4 text-primary" />
                          <span>Target Role: {goal.target_role}</span>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{goal.calculated_progress}%</span>
                        </div>
                        <Progress value={goal.calculated_progress} className="h-2" />
                      </div>

                      {goal.skill_gaps && goal.skill_gaps.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Skills to Develop:</h4>
                          <div className="flex flex-wrap gap-1">
                            {goal.skill_gaps.slice(0, 4).map((skill: string, index: number) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                            {goal.skill_gaps.length > 4 && (
                              <Badge variant="outline" className="text-xs">
                                +{goal.skill_gaps.length - 4} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button 
                          size="sm" 
                          onClick={() => generateLearningPlan(goal.id)}
                          className="flex items-center gap-2"
                        >
                          <BookOpen className="h-4 w-4" />
                          Create Learning Plan
                        </Button>
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          <Card>
            <CardContent className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Learning Plans Yet</h3>
              <p className="text-muted-foreground mb-4">
                Generate learning plans from your goals to get started
              </p>
              <Button 
                onClick={() => setActiveTab('goals')}
                className="flex items-center gap-2"
              >
                <ArrowRight className="h-4 w-4" />
                View Goals
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}