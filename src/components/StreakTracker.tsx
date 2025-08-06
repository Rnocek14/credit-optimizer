import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useGamification } from '@/hooks/useGamification';
import { Flame, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StreakTrackerProps {
  userId?: string;
  onStreakUpdate?: (streak: number) => void;
}

export function StreakTracker({ userId, onStreakUpdate }: StreakTrackerProps) {
  const { toast } = useToast();
  const { 
    getCurrentStreak, 
    getStreakMultiplier, 
    updateStreak,
    isLoading 
  } = useGamification(userId);

  const currentStreak = getCurrentStreak();
  const multiplier = getStreakMultiplier();

  useEffect(() => {
    if (onStreakUpdate) {
      onStreakUpdate(currentStreak);
    }
  }, [currentStreak, onStreakUpdate]);

  const handleStreakUpdate = () => {
    updateStreak.mutate();
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </CardHeader>
        <CardContent>
          <div className="h-8 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-red-500/10" />
      <CardHeader className="relative">
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          Learning Streak
        </CardTitle>
        <CardDescription>
          Maintain daily learning to boost your XP multiplier
        </CardDescription>
      </CardHeader>
      <CardContent className="relative space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-orange-600">
              🔥 {currentStreak}
            </div>
            <p className="text-sm text-muted-foreground">
              {currentStreak === 1 ? 'day streak' : 'days streak'}
            </p>
          </div>
          
          <div className="text-right">
            <div className="flex items-center gap-1 text-sm font-semibold text-blue-600">
              <Zap className="h-4 w-4" />
              {multiplier.toFixed(2)}x XP
            </div>
            <p className="text-xs text-muted-foreground">
              Bonus multiplier
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Next milestone</span>
            <span>{Math.ceil(currentStreak / 7) * 7} days</span>
          </div>
          <div className="bg-muted rounded-full h-2">
            <div 
              className="bg-orange-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStreak % 7) / 7) * 100}%` }}
            />
          </div>
        </div>

        <Button 
          onClick={handleStreakUpdate}
          className="w-full"
          variant="outline"
          disabled={updateStreak.isPending}
        >
          {updateStreak.isPending ? 'Updating...' : 'Update Streak'}
        </Button>
        
        {currentStreak === 0 && (
          <p className="text-xs text-muted-foreground text-center">
            Start a learning session to begin your streak!
          </p>
        )}
      </CardContent>
    </Card>
  );
}