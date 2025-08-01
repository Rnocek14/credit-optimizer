import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, Target, ArrowRight, Clock, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NextSmartStepProps {
  userId: string;
}

interface Goal {
  id: string;
  goal_title: string;
  goal_type?: string;
  description?: string;
  target_role?: string;
  target_date?: string;
  current_progress?: number;
  priority_score?: number;
  priority_tier?: string;
  skill_gaps?: string[];
  [key: string]: any;
}

export function NextSmartStep({ userId }: NextSmartStepProps) {
  const [nextStep, setNextStep] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      fetchNextStep();
    }
  }, [userId]);

  const fetchNextStep = async () => {
    try {
      setLoading(true);
      
      // First try to get existing ranked goals
      try {
        const response = await (supabase as any)
          .from('user_goals')
          .select('*')
          .eq('user_id', userId)
          .eq('active', true)
          .order('priority_score', { ascending: false })
          .limit(1);
        
        const rankedGoals = response.data;
        const goalsError = response.error;

        if (goalsError) {
          console.error('Error fetching goals:', goalsError);
        }

        if (rankedGoals && rankedGoals.length > 0) {
          setNextStep(rankedGoals[0]);
        } else {
          // Generate new smart goals if none exist
          await generateSmartStep();
        }
      } catch (queryError) {
        console.error('Query error:', queryError);
        await generateSmartStep();
      }
    } catch (error) {
      console.error('Error fetching next step:', error);
      toast({
        title: "Error",
        description: "Failed to load your next smart step",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateSmartStep = async () => {
    try {
      setGenerating(true);
      
      // Call goal priority ranking
      const rankingResponse = await supabase.functions.invoke('goal-priority-ranking', {
        body: { user_id: userId }
      });

      const rankingResult = rankingResponse.data;

      if (rankingResult?.success && rankingResult.ranked_goals?.length > 0) {
        setNextStep(rankingResult.ranked_goals[0] as Goal);
        
        toast({
          title: "Smart Step Generated",
          description: "Your personalized next step is ready!",
        });
      } else {
        // Fallback: generate smart goals first
        await supabase.functions.invoke('generate-smart-goals', {
          body: { user_id: userId }
        });
        
        // Then rank them
        setTimeout(() => fetchNextStep(), 2000);
      }
    } catch (error) {
      console.error('Error generating smart step:', error);
      toast({
        title: "Error",
        description: "Failed to generate your next smart step",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const getPriorityColor = (score: number) => {
    if (score >= 80) return 'bg-red-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getTimeUrgency = (targetDate: string | null | undefined) => {
    if (!targetDate) return null;
    
    const days = Math.floor(
      (new Date(targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (days < 30) return { label: 'Urgent', color: 'destructive' };
    if (days < 90) return { label: 'Soon', color: 'secondary' };
    return { label: 'Long-term', color: 'outline' };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Your Next Smart Step
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
            <div className="h-8 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!nextStep) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Your Next Smart Step
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
          <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold mb-2">No Goals Found</h3>
          <p className="text-muted-foreground mb-4">
            Let's generate some personalized smart goals for you
          </p>
          <Button 
            onClick={generateSmartStep} 
            disabled={generating}
            className="flex items-center gap-2"
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Generating...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4" />
                Generate Smart Goals
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const urgency = getTimeUrgency(nextStep.target_date);
  const progress = nextStep.current_progress || 0;
  const priorityScore = nextStep.priority_score || 50;

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Your Next Smart Step
          </div>
          <Badge 
            variant="secondary" 
            className={`${getPriorityColor(priorityScore)} text-white`}
          >
            Priority: {priorityScore}/100
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg mb-2">{nextStep.goal_title}</h3>
          {nextStep.description && (
            <p className="text-muted-foreground text-sm">{nextStep.description}</p>
          )}
        </div>

        {nextStep.target_role && (
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Target Role: {nextStep.target_role}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {urgency && (
            <Badge variant={urgency.color as any} className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {urgency.label}
            </Badge>
          )}
          
          {nextStep.priority_tier && (
            <Badge variant="outline">
              <TrendingUp className="h-3 w-3 mr-1" />
              {nextStep.priority_tier} priority
            </Badge>
          )}

          {nextStep.skill_gaps && nextStep.skill_gaps.length > 0 && (
            <Badge variant="secondary">
              {nextStep.skill_gaps.length} skills to learn
            </Badge>
          )}
        </div>

        {progress > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {nextStep.skill_gaps && nextStep.skill_gaps.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Key Skills to Develop:</h4>
            <div className="flex flex-wrap gap-1">
              {nextStep.skill_gaps.slice(0, 3).map((skill: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {nextStep.skill_gaps.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{nextStep.skill_gaps.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button 
            size="sm" 
            className="flex items-center gap-2"
            onClick={() => window.location.href = '/planner'}
          >
            <ArrowRight className="h-4 w-4" />
            Create Learning Plan
          </Button>
          
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => window.location.href = '/goals'}
          >
            View All Goals
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}