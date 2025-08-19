import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Zap, TrendingUp, Target } from 'lucide-react';
import { useRealtimeXP } from '@/hooks/useRealtimeXP';
import { useActiveTrackStore } from '@/stores/useActiveTrackStore';

interface RealtimeXPTrackerProps {
  className?: string;
  showTestButton?: boolean;
}

export function RealtimeXPTracker({ className, showTestButton = false }: RealtimeXPTrackerProps) {
  const { currentXP, currentLevel, awardXP } = useRealtimeXP();
  const { activeTrackId } = useActiveTrackStore();

  // Calculate XP for current level and next level
  const getXPForLevel = (level: number) => {
    if (level === 1) return 0;
    if (level === 2) return 100;
    if (level === 3) return 250;
    if (level === 4) return 500;
    return 500 + (level - 4) * 500;
  };

  const currentLevelXP = getXPForLevel(currentLevel);
  const nextLevelXP = getXPForLevel(currentLevel + 1);
  const progressInLevel = currentXP - currentLevelXP;
  const xpNeededForNext = nextLevelXP - currentLevelXP;
  const progressPercentage = Math.min((progressInLevel / xpNeededForNext) * 100, 100);

  const handleTestXP = () => {
    const testReasons = [
      'Course completed',
      'Quiz mastered',
      'Project milestone',
      'Daily goal achieved',
      'Skill unlocked',
    ];
    const amounts = [10, 15, 25, 50, 100];
    
    const randomReason = testReasons[Math.floor(Math.random() * testReasons.length)];
    const randomAmount = amounts[Math.floor(Math.random() * amounts.length)];
    
    awardXP(randomAmount, randomReason, 'test');
  };

  if (!activeTrackId) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">
            <Zap className="h-8 w-8 mx-auto mb-2" />
            <p>Select a track to view XP progress</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <span className="font-medium">Track XP</span>
            </div>
            <Badge variant="secondary" className="animate-pulse">
              Level {currentLevel}
            </Badge>
          </div>

          {/* XP Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress to Level {currentLevel + 1}</span>
              <span className="font-medium">{progressInLevel} / {xpNeededForNext} XP</span>
            </div>
            <Progress 
              value={progressPercentage} 
              className="h-3 transition-all duration-500 ease-out"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Level {currentLevel}</span>
              <span>Level {currentLevel + 1}</span>
            </div>
          </div>

          {/* Current Stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-muted/50 rounded-lg">
              <div className="text-lg font-bold text-primary">{currentXP}</div>
              <div className="text-xs text-muted-foreground">Total XP</div>
            </div>
            <div className="p-2 bg-muted/50 rounded-lg">
              <div className="text-lg font-bold text-primary">{currentLevel}</div>
              <div className="text-xs text-muted-foreground">Level</div>
            </div>
            <div className="p-2 bg-muted/50 rounded-lg">
              <div className="text-lg font-bold text-primary">{nextLevelXP - currentXP}</div>
              <div className="text-xs text-muted-foreground">To Next</div>
            </div>
          </div>

          {/* Live Indicator */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live updates enabled</span>
            </div>
            {showTestButton && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleTestXP}
                className="text-xs"
              >
                <TrendingUp className="h-3 w-3 mr-1" />
                Test XP
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}