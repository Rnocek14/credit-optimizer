import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, Sparkles, TrendingUp, Lightbulb, X, ThumbsUp, MessageCircle, Zap } from 'lucide-react';
import { useMayaProactiveInsights } from '@/hooks/useMayaProactiveInsights';
import { getCurrentUser } from '@/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface MayaInsightsCardProps {
  userName?: string;
  currentStreak: number;
  nextStep?: {
    title: string;
    type: string;
  };
  recommendations?: Array<{
    title: string;
    priority: string;
  }>;
}

export function MayaInsightsCard({ 
  userName = "there", 
  currentStreak, 
  nextStep,
  recommendations = []
}: MayaInsightsCardProps) {
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: getCurrentUser,
    staleTime: 1000 * 60 * 5,
  });
  const { insights, loading, generateInsights, dismissInsight, markAsActedUpon } = useMayaProactiveInsights(user?.id);
  const [currentInsightIndex, setCurrentInsightIndex] = useState(0);

  const [hasTriedAutoGeneration, setHasTriedAutoGeneration] = React.useState(false);

  // Auto-generate insights on mount if user has none (only once)
  React.useEffect(() => {
    if (user?.id && insights.length === 0 && !loading && !hasTriedAutoGeneration) {
      console.log('🤖 Auto-generating Maya insights for user:', user.id);
      setHasTriedAutoGeneration(true);
      generateInsights('daily', true); // Silent mode for auto-generation
    }
  }, [user?.id, insights.length, loading, hasTriedAutoGeneration, generateInsights]);

  // Use proactive insights if available, fallback to static logic
  const hasProactiveInsights = insights.length > 0;
  const currentInsight = hasProactiveInsights ? insights[currentInsightIndex] : null;
  const getPersonalizedGreeting = () => {
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    
    if (currentStreak === 0) {
      return `Good ${timeOfDay}, ${userName}! Ready to start fresh? I've got some exciting opportunities lined up for you.`;
    } else if (currentStreak < 3) {
      return `Good ${timeOfDay}, ${userName}! Your ${currentStreak}-day streak is building momentum. Let's keep it going strong!`;
    } else if (currentStreak < 7) {
      return `Impressive ${currentStreak}-day streak, ${userName}! You're developing a powerful habit. I'm excited to guide your next moves.`;
    } else {
      return `Outstanding ${currentStreak}-day streak, ${userName}! Your dedication is inspiring. Let me show you how to maximize this momentum.`;
    }
  };

  const getPersonalizedInsight = () => {
    if (currentInsight) {
      return currentInsight.content;
    }
    
    const highPriorityRecs = recommendations.filter(r => r.priority === 'critical' || r.priority === 'high').length;
    
    if (nextStep?.type === 'skill_gap') {
      return `I notice you have skill development opportunities. Based on your career trajectory, focusing on ${nextStep.title.toLowerCase()} could boost your readiness significantly.`;
    } else if (highPriorityRecs > 2) {
      return `You have ${highPriorityRecs} high-impact opportunities waiting. I recommend tackling them systematically to maximize your career velocity.`;
    } else if (currentStreak > 7) {
      return `Your consistency is remarkable! With this learning velocity, you're on track to achieve major career milestones ahead of schedule.`;
    }
    
    return `I'm analyzing market trends and your profile to surface the most impactful next steps. Your personalized roadmap is designed for sustainable growth.`;
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <Zap className="h-3 w-3 text-red-500" />;
      case 'high': return <TrendingUp className="h-3 w-3 text-orange-500" />;
      case 'medium': return <Lightbulb className="h-3 w-3 text-primary" />;
      default: return <Lightbulb className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'medium': return 'border-primary bg-primary/5';
      default: return 'border-border bg-muted/20';
    }
  };

  const handleNextInsight = () => {
    if (insights.length > 1) {
      setCurrentInsightIndex((prev) => (prev + 1) % insights.length);
    }
  };

  const handleDismissInsight = () => {
    if (currentInsight) {
      dismissInsight(currentInsight.id);
      if (insights.length > 1) {
        setCurrentInsightIndex((prev) => prev === insights.length - 1 ? 0 : prev);
      }
    }
  };

  const handleActOnInsight = () => {
    if (currentInsight) {
      markAsActedUpon(currentInsight.id);
    }
  };

  return (
    <Card className={cn(
      "border-l-4 bg-gradient-to-br from-background to-muted/20",
      currentInsight ? getPriorityColor(currentInsight.priority) : "border-l-primary"
    )}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="p-1.5 rounded-full bg-primary/10">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          Maya's {hasProactiveInsights ? 'Live' : 'Daily'} Insights
          <div className="flex items-center gap-2 ml-auto">
            {currentInsight && (
              <Badge variant="outline" className="text-xs">
                {getPriorityIcon(currentInsight.priority)}
                <span className="ml-1 capitalize">{currentInsight.priority}</span>
              </Badge>
            )}
            <Badge variant="secondary">
              <Sparkles className="h-3 w-3 mr-1" />
              {hasProactiveInsights ? 'Live AI' : 'AI Powered'}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {hasProactiveInsights && currentInsight ? (
            <>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium text-sm leading-relaxed">
                  {currentInsight.title}
                </h3>
                {insights.length > 1 && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">
                      {currentInsightIndex + 1}/{insights.length}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0" 
                      onClick={handleNextInsight}
                    >
                      <TrendingUp className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
              <div className={cn(
                "p-3 rounded-lg border",
                getPriorityColor(currentInsight.priority)
              )}>
                <div className="flex items-start gap-2">
                  {getPriorityIcon(currentInsight.priority)}
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                    {currentInsight.content}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                    onClick={handleDismissInsight}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                {currentInsight.context_data?.next_actions && (
                  <div className="mt-2 pt-2 border-t border-border/30">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={handleActOnInsight}
                      >
                        <ThumbsUp className="h-3 w-3 mr-1" />
                        Take Action
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {currentInsight.context_data.timeline || 'When ready'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="text-sm leading-relaxed">
                {getPersonalizedGreeting()}
              </p>
              
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {getPersonalizedInsight()}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            <span>
              {hasProactiveInsights 
                ? `${insights.length} active insight${insights.length !== 1 ? 's' : ''}`
                : `Analyzing ${recommendations.length} opportunities`
              }
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {hasProactiveInsights && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs h-7"
                onClick={() => generateInsights()}
                disabled={loading}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-7"
              onClick={() => window.location.href = '/maya'}
            >
              <MessageCircle className="h-3 w-3 mr-1" />
              Ask Maya
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}