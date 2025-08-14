import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Calendar, Clock, Target, TrendingUp, Zap, Users, BookOpen, Award, Flame, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useSmartTodayDashboard } from '@/hooks/useSmartTodayDashboard';
import { CRIBoostChip } from '@/components/ui/cri-boost-chip';

interface TodayDashboardProps {
  onNextStepClick?: () => void;
}

export function TodayDashboard({ onNextStepClick }: TodayDashboardProps) {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => (await supabase.auth.getUser()).data.user
  });
  const {
    nextStep,
    quickWins,
    currentStreak,
    unstickData,
    isLoading,
    actions
  } = useSmartTodayDashboard(user?.id);

  const handleNextStepClick = (actionIndex = 0) => {
    if (!nextStep || !nextStep.actions[actionIndex]) return;
    
    actions.handleNextStepAction(nextStep.actions[actionIndex]);
    
    if (onNextStepClick) {
      onNextStepClick();
    }
  };

  // Mock focus skills for display
  const focusSkills = [
    { name: 'React Hooks', progress: 75, level: 'Advanced' },
    { name: 'TypeScript', progress: 60, level: 'Intermediate' },
    { name: 'Node.js', progress: 45, level: 'Beginner' }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded w-full"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Smart Next Step Card */}
        <Card className="md:col-span-2 lg:col-span-1 border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Next Step
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {nextStep ? (
              <>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{nextStep.title}</h3>
                    {nextStep.criBoost && (
                      <CRIBoostChip 
                        boostPercentage={nextStep.criBoost}
                        explanation={nextStep.criExplanation}
                        size="sm"
                      />
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {nextStep.description}
                  </p>
                </div>
                
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{nextStep.timeEstimate || 'Quick task'}</span>
                  </div>
                  <Badge variant={
                    nextStep.type === 'skill_gap' ? 'destructive' :
                    nextStep.type === 'maya_action' ? 'default' :
                    nextStep.type === 'market_alert' ? 'secondary' : 'outline'
                  }>
                    {nextStep.type.replace('_', ' ')}
                  </Badge>
                </div>

                {nextStep.progress && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{nextStep.progress}%</span>
                    </div>
                    <Progress value={nextStep.progress} className="h-2" />
                  </div>
                )}

                <div className="flex gap-2">
                  {nextStep.actions.slice(0, 2).map((action, index) => (
                    <Button 
                      key={index}
                      onClick={() => handleNextStepClick(index)}
                      variant={index === 0 ? 'default' : 'outline'}
                      className="flex-1"
                      data-testid={`next-step-action-${index}`}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No recommendations available</p>
                <p className="text-sm">Check back later for personalized suggestions</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Focus Skills Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-500" />
              Focus Skills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {focusSkills.map((skill, index) => (
                <div key={skill.name} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                  <div>
                    <p className="font-medium text-sm">{skill.name}</p>
                    <p className="text-xs text-muted-foreground">{skill.level}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{skill.progress}%</p>
                    <Progress value={skill.progress} className="h-1 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Smart Quick Wins Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Quick Wins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {quickWins.length > 0 ? (
                quickWins.map((win, index) => (
                  <div key={win.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{win.title}</p>
                        {win.criBoost && (
                          <CRIBoostChip 
                            boostPercentage={win.criBoost}
                            explanation="CRI boost applied"
                            size="sm"
                          />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{win.description}</p>
                      <p className="text-xs text-muted-foreground">{win.timeEstimate}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => actions.handleQuickWinAction(win, win.actions[0])}
                      data-testid={`quick-win-${index}`}
                    >
                      Start
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No quick wins available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Smart Progress & Streak Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-purple-500" />
              Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Flame className="h-5 w-5 text-orange-500" />
                </div>
                <p className="text-2xl font-bold">{currentStreak}</p>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <p className="text-2xl font-bold">3</p>
                <p className="text-xs text-muted-foreground">Level</p>
              </div>
            </div>
            
            {unstickData && (
              <div className="p-3 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                    {unstickData.daysSinceActivity} days since last activity
                  </p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full"
                  onClick={actions.handleUnstickAction}
                  data-testid="unstick-button"
                >
                  Unstick me • {unstickData.timeEstimate}
                </Button>
              </div>
            )}
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Weekly Goal</span>
                <span>75%</span>
              </div>
              <Progress value={75} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                2 more sessions this week
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}