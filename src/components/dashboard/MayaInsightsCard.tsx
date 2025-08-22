import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, Sparkles, TrendingUp, Lightbulb } from 'lucide-react';

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

  return (
    <Card className="border-l-4 border-l-primary bg-gradient-to-br from-background to-muted/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="p-1.5 rounded-full bg-primary/10">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          Maya's Daily Insights
          <Badge variant="secondary" className="ml-auto">
            <Sparkles className="h-3 w-3 mr-1" />
            AI Powered
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
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
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            <span>Analyzing {recommendations.length} opportunities</span>
          </div>
          
          <Button variant="ghost" size="sm" className="text-xs h-8">
            Ask Maya
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}