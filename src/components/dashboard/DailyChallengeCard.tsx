import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  Clock, 
  Star, 
  CheckCircle, 
  Flame,
  BookOpen,
  Code,
  Users,
  Lightbulb
} from 'lucide-react';

interface DailyChallengeCardProps {
  currentStreak: number;
  userId?: string;
  skillGaps?: Array<string>;
  onChallengeComplete?: (challengeId: string, xpAwarded: number) => void;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  timeEstimate: string;
  xpReward: number;
  type: 'skill_practice' | 'learning' | 'social' | 'creative';
  difficulty: 'easy' | 'medium' | 'hard';
  icon: React.ComponentType<{ className?: string }>;
  completed?: boolean;
}

export function DailyChallengeCard({ 
  currentStreak, 
  userId,
  skillGaps = [],
  onChallengeComplete 
}: DailyChallengeCardProps) {
  const [completedToday, setCompletedToday] = useState(false);

  const dailyChallenge = useMemo((): Challenge => {
    const challenges: Challenge[] = [
      // Skill Practice Challenges
      {
        id: 'skill-practice-1',
        title: 'Master a New Concept',
        description: `Practice ${skillGaps[0] || 'a core skill'} for 15 minutes`,
        timeEstimate: '15 min',
        xpReward: 25,
        type: 'skill_practice',
        difficulty: 'easy',
        icon: BookOpen
      },
      {
        id: 'skill-practice-2', 
        title: 'Code Challenge',
        description: 'Complete a coding exercise or algorithm problem',
        timeEstimate: '20 min',
        xpReward: 35,
        type: 'skill_practice',
        difficulty: 'medium',
        icon: Code
      },
      
      // Learning Challenges
      {
        id: 'learning-1',
        title: 'Knowledge Expansion', 
        description: 'Read an article or watch a tutorial about emerging tech',
        timeEstimate: '10 min',
        xpReward: 20,
        type: 'learning',
        difficulty: 'easy',
        icon: Lightbulb
      },
      {
        id: 'learning-2',
        title: 'Deep Dive Session',
        description: 'Study a complex topic for 30 minutes with note-taking',
        timeEstimate: '30 min', 
        xpReward: 50,
        type: 'learning',
        difficulty: 'hard',
        icon: BookOpen
      },

      // Social Challenges
      {
        id: 'social-1',
        title: 'Share Your Learning',
        description: 'Write a brief post about something you learned recently',
        timeEstimate: '10 min',
        xpReward: 30,
        type: 'social',
        difficulty: 'easy',
        icon: Users
      },

      // Creative Challenges  
      {
        id: 'creative-1',
        title: 'Build Something Small',
        description: 'Create a mini project or prototype using your skills',
        timeEstimate: '45 min',
        xpReward: 75,
        type: 'creative',
        difficulty: 'hard',
        icon: Code
      }
    ];

    // Select challenge based on streak and day of week
    const dayOfYear = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    const challengeIndex = (dayOfYear + (currentStreak % 3)) % challenges.length;
    
    return challenges[challengeIndex];
  }, [currentStreak, skillGaps]);

  const handleCompleteChallenge = () => {
    setCompletedToday(true);
    
    // Calculate bonus XP for streak
    const streakBonus = Math.min(currentStreak * 2, 20); // Max 20 bonus XP
    const totalXP = dailyChallenge.xpReward + streakBonus;
    
    onChallengeComplete?.(dailyChallenge.id, totalXP);
  };

  const getDifficultyColor = () => {
    switch (dailyChallenge.difficulty) {
      case 'easy': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'hard': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTypeIcon = () => {
    const IconComponent = dailyChallenge.icon;
    return <IconComponent className="h-4 w-4" />;
  };

  if (completedToday) {
    return (
      <Card className="border-l-4 border-l-green-500 bg-green-50/50 dark:bg-green-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Daily Challenge Complete!
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-3">
          <div className="text-2xl">🎉</div>
          <p className="text-sm text-muted-foreground">
            Great job! You completed today's challenge and earned{' '}
            <span className="font-medium text-green-600">
              {dailyChallenge.xpReward + Math.min(currentStreak * 2, 20)} XP
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            Come back tomorrow for a new challenge
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-purple-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="p-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30">
            {getTypeIcon()}
          </div>
          Maya's Daily Challenge
          {currentStreak > 0 && (
            <Badge variant="secondary" className="ml-auto">
              <Flame className="h-3 w-3 mr-1" />
              {currentStreak} streak
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">{dailyChallenge.title}</h3>
            <Badge 
              variant="outline" 
              className={`text-xs ${getDifficultyColor()}`}
            >
              {dailyChallenge.difficulty}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {dailyChallenge.description}
          </p>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{dailyChallenge.timeEstimate}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500" />
              <span>{dailyChallenge.xpReward} XP</span>
              {currentStreak > 0 && (
                <span className="text-green-600 text-xs">
                  +{Math.min(currentStreak * 2, 20)} streak bonus
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-border/50">
          <Button 
            onClick={handleCompleteChallenge}
            className="w-full"
            size="sm"
          >
            <Target className="h-4 w-4 mr-2" />
            Accept Challenge
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}